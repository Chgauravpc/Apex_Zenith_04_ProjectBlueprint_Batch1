"""Ask Experience: grounded answers built only from retrieved records.

The LLM may only cite ids it was given; anything else is dropped. With no usable source
the answer says "not enough data" and names the old employee to ask, and the question is
logged as a knowledge gap (it later becomes an interview question for old employees).
Offline (no LLM), the answer quotes the best verified cards word for word.
"""

import logging
from typing import Dict, List, Optional, Tuple

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import NotFound, ProviderUnavailable, ValidationFailed
from app.models.erp import ROLE_OLD, Employee, Machine
from app.models.knowledge import KnowledgeCard
from app.models.ops import Query
from app.models.transfer import KnowledgeGap
from app.prompts import wrap_records
from app.prompts.answer import ANSWER_SYSTEM, ANSWER_USER, LANGUAGE_NAMES
from app.schemas.ask import (
    AnswerLLM,
    AskAnswer,
    AskRequest,
    ExpertOut,
    FeedbackIn,
    FeedbackOut,
    Hit,
    SourceOut,
)
from app.services import llm, stt, tts
from app.services.ask.search import hybrid_search, media_url
from app.utils import lexicon
from app.utils.audit import audit
from app.utils.files import save_upload

logger = logging.getLogger(__name__)

TOP_K = 6
OFFLINE_STEPS = 3
FEEDBACK_STEP = 0.1  # how much one 👍/👎 moves a cited card's score
NOT_ENOUGH = {
    "en": "I could not find this in what our experienced employees have recorded.",
    "hi": "हमारे अनुभवी कर्मचारियों के रिकॉर्ड में इसका जवाब नहीं मिला।",
    "mr": "आमच्या अनुभवी कर्मचाऱ्यांच्या नोंदीत याचे उत्तर सापडले नाही.",
}


def _source(hit: Hit) -> SourceOut:
    return SourceOut(
        id=hit.ref,
        kind=hit.kind,
        title=hit.title,
        text=hit.text,
        snippet=hit.snippet,
        action=hit.action,
        author=hit.author,
        machine=hit.machine,
        component=hit.component,
        media_url=hit.media_url,
        timestamp=hit.timestamp,
        verified=hit.verified,
        date=hit.when,
    )


def machine_experts(db: Session, machine_id: Optional[int], limit: int = 3) -> List[ExpertOut]:
    """Old employees ranked by verified cards on the machine (one GROUP BY query)."""
    conds = [KnowledgeCard.verified_by_id.is_not(None), Employee.role == ROLE_OLD]
    if machine_id is not None:
        conds.append(KnowledgeCard.machine_id == machine_id)
    rows = db.execute(
        select(Employee.id, Employee.name, func.count(KnowledgeCard.id).label("n"))
        .join(KnowledgeCard, KnowledgeCard.author_id == Employee.id)
        .where(*conds)
        .group_by(Employee.id, Employee.name)
        .order_by(func.count(KnowledgeCard.id).desc(), Employee.id)
        .limit(limit)
    ).all()
    return [ExpertOut(id=r.id, name=r.name, cards=r.n) for r in rows]


# Words that carry no topic, in the languages people ask in.
STOPWORDS = frozenset(
    "the a an and or of to in on at for with how what why when which is are was do does did "
    "i we you it this that my our can should machine there here not no from about "
    "क्या क्यों कैसे कब है हैं था थी रहा रही रहे में पर से का की के को और या यह वह "
    "मशीन काय कसे आहे का".split()
)
MIN_SHARED = 0.5  # offline: a card must share half the question's topic words


def _topic_words(text: str) -> set:
    """Meaningful words: no stopwords, no tiny words, no codes like VMC-3 or SS304."""
    return {
        w
        for w in lexicon.normalize(text).split()
        if len(w) >= 3 and w not in STOPWORDS and not any(ch.isdigit() for ch in w)
    }


def _relevant(question: str, hit: Hit) -> bool:
    """Offline relevance gate: same symptom, or most of the question's topic words.

    Without an LLM nothing else checks that a card actually answers the question, and an
    off-topic tip on a machine is worse than "not enough data".
    """
    if hit.symptom and hit.symptom in lexicon.find_symptoms(question):
        return True
    words = _topic_words(question)
    if not words:
        return False
    shared = words & _topic_words(hit.text)
    return len(shared) / len(words) >= MIN_SHARED


def _offline(question: str, hits: List[Hit]) -> AnswerLLM:
    """Rule-based answer: the best relevant cards' own words, plus a past problem to watch."""
    cards = [h for h in hits if h.record_type == "card" and h.action and _relevant(question, h)]
    if not cards:
        return AnswerLLM(answer="", not_enough_data=True, confidence=0.0)
    best = cards[0]
    who = f"{best.author}'s" if best.author else "Recorded"
    history = next(
        (
            h
            for h in hits
            if h.record_type in ("qc_reject", "maintenance") and _relevant(question, h)
        ),
        None,
    )
    return AnswerLLM(
        answer=f"{who} know-how ({best.title}): {best.action}",
        steps=[c.action for c in cards[:OFFLINE_STEPS] if c.verified] or [best.action],
        watch_out=f"Past {history.kind.lower()}: {history.snippet}" if history else None,
        source_ids=[c.ref for c in cards[:OFFLINE_STEPS]] + ([history.ref] if history else []),
        confidence=0.6 if best.verified else 0.4,
    )


def _ask_llm(req: AskRequest, hits: List[Hit], machine: Optional[str]) -> Tuple[AnswerLLM, str]:
    system = ANSWER_SYSTEM.format(
        language=LANGUAGE_NAMES.get(req.language or "", "the " "language of the question")
    )
    user = ANSWER_USER.format(
        question=wrap_records([("question", req.question)]),
        machine=machine or "any",
        records=wrap_records(
            (h.ref, f"[{h.kind}, by {h.author or 'unknown'}] {h.text}") for h in hits
        ),
    )
    try:
        return llm.chat_json("answer", system, user, AnswerLLM), "live"
    except ProviderUnavailable:
        return _offline(req.question, hits), "offline"


def _record_gap(db: Session, req: AskRequest) -> None:
    topic = req.question.strip()[:200]
    gap = db.execute(
        select(KnowledgeGap).filter_by(machine_id=req.machine_id, topic=topic)
    ).scalar_one_or_none()
    if gap is None:
        db.add(
            KnowledgeGap(
                machine_id=req.machine_id,
                component_id=req.component_id,
                topic=topic,
                source="unanswered_query",
            )
        )
    else:
        gap.count += 1
        gap.resolved = False


def answer(db: Session, req: AskRequest, transcript: Optional[str] = None) -> AskAnswer:
    """Answer a question from captured knowledge only, citing every source used."""
    machine = db.get(Machine, req.machine_id) if req.machine_id is not None else None
    if req.machine_id is not None and machine is None:
        raise NotFound(f"machine {req.machine_id} not found")
    hits = hybrid_search(db, req.question, req.machine_id, req.component_id, k=TOP_K)
    out, mode = (
        _ask_llm(req, hits, machine.name if machine else None)
        if hits
        else (AnswerLLM(answer="", not_enough_data=True, confidence=0.0), "live")
    )

    by_ref: Dict[str, Hit] = {h.ref: h for h in hits}
    cited = [by_ref[i] for i in dict.fromkeys(out.source_ids) if i in by_ref]  # drop invented
    not_enough = out.not_enough_data or not cited
    experts = machine_experts(db, req.machine_id)
    lang = req.language or "en"
    if not_enough:
        _record_gap(db, req)
    query = Query(
        question=req.question,
        language=req.language,
        asked_by_id=req.asked_by_id,
        machine_id=req.machine_id,
        component_id=req.component_id,
        answer=None if not_enough else out.answer,
        sources=[{"type": h.record_type, "id": h.record_id} for h in cited],
        answered=not not_enough,
        mode=mode,
    )
    db.add(query)
    db.flush()
    audit(
        db,
        "ask.answered",
        actor_id=req.asked_by_id,
        target_type="query",
        target_id=query.id,
        mode=mode,
        sources=len(cited),
        not_enough_data=not_enough,
    )
    db.commit()

    top = experts[0] if experts else None
    return AskAnswer(
        query_id=query.id,
        question=req.question,
        transcript=transcript,
        answer=NOT_ENOUGH.get(lang, NOT_ENOUGH["en"]) if not_enough else out.answer,
        steps=[] if not_enough else out.steps,
        watch_out=None if not_enough else out.watch_out,
        sources=[_source(h) for h in cited],
        experts=experts,
        suggested_expert=top.name if top else None,
        suggested_expert_id=top.id if top else None,
        confidence=0.0 if not_enough else out.confidence,
        not_enough_data=not_enough,
        mode=mode,
    )


def record_feedback(db: Session, query_id: int, fb: FeedbackIn) -> FeedbackOut:
    """👍/👎 on an answer nudges the score of every card it cited (learning loop)."""
    query = db.get(Query, query_id)
    if query is None:
        raise NotFound(f"question {query_id} not found")
    query.feedback = 1 if fb.helpful else -1
    query.fix_worked = fb.fix_worked
    card_ids = [s["id"] for s in query.sources if s.get("type") == "card"]
    delta = FEEDBACK_STEP if fb.helpful else -FEEDBACK_STEP
    cards = (
        list(db.execute(select(KnowledgeCard).where(KnowledgeCard.id.in_(card_ids))).scalars())
        if card_ids
        else []
    )
    for card in cards:
        card.score = round(card.score + delta, 3)
    audit(
        db,
        "ask.feedback",
        target_type="query",
        target_id=query.id,
        helpful=fb.helpful,
        note=fb.note,
    )
    db.commit()
    return FeedbackOut(query_id=query.id, feedback=query.feedback, cards_updated=len(cards))


def answer_voice(
    db: Session,
    file: UploadFile,
    machine_id: Optional[int],
    language: Optional[str],
    asked_by_id: Optional[int] = None,
) -> AskAnswer:
    """Spoken question: Groq Whisper → answer() → answer read aloud (edge-tts, best effort).

    Raises:
        ProviderUnavailable: speech-to-text is not available (the UI then asks to type).
    """
    path = save_upload(file, "audio")
    transcript = stt.transcribe(path, language)
    if not transcript.text:
        raise ValidationFailed("no speech was heard in the recording")
    req = AskRequest(
        question=transcript.text[:2000],
        machine_id=machine_id,
        language=language,
        asked_by_id=asked_by_id,
    )
    result = answer(db, req, transcript=transcript.text)
    try:
        spoken = tts.synthesize(result.answer[: tts.MAX_CHARS], language or "hi")
        result.audio_url = media_url(str(spoken))
    except ProviderUnavailable:
        result.audio_url = None  # the browser reads it with speechSynthesis instead
    return result
