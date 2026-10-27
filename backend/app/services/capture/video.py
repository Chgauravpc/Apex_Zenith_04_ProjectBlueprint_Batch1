"""Setup video → key frames (and, next, a draft step-by-step procedure).

Key frames: sample the video at `fps`, compare each sample's colour histogram with the
last key frame, and keep frames where the scene changed. Only sampled frames are decoded
(`grab()` skips the rest cheaply), so the cost is O(frames) with O(1) frames in memory
besides the kept JPEGs.
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import fts_index
from app.errors import ProviderUnavailable, ValidationFailed
from app.models.guide import Procedure, ProcedureStep
from app.models.knowledge import Document
from app.prompts import wrap_records
from app.prompts.video import VIDEO_PROMPT
from app.schemas.capture import DraftStep, VideoProcedureDraft
from app.services import llm, stt
from app.utils.audit import audit

logger = logging.getLogger(__name__)

MAX_KEYFRAMES = 30  # most the vision LLM is sent (ENGINEERING.md §4)
MAX_LONG_SIDE = 1280  # px, key frames are resized before storing/sending
HIST_SIDE = 160  # px, small copy used only for the histogram (fast, noise-tolerant)
HIST_BINS = [32, 32]  # hue × saturation
SCENE_CHANGE = 0.35  # Bhattacharyya distance above which a new scene starts (0 = same)
JPEG_QUALITY = 85
# Free vision models accept a limited number of images per request; frames are thinned
# evenly to this many before the call (the rest still exist for the step editor).
VISION_MAX_IMAGES = 12
OFFLINE_TITLE = "Setup procedure (draft from video)"


@dataclass(frozen=True)
class Keyframe:
    ts: float  # seconds from the start of the video
    jpeg_bytes: bytes


def _resize(frame: np.ndarray, long_side: int) -> np.ndarray:
    h, w = frame.shape[:2]
    scale = long_side / max(h, w)
    if scale >= 1:
        return frame
    return cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def _histogram(frame: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(_resize(frame, HIST_SIDE), cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, HIST_BINS, [0, 180, 0, 256])
    return cv2.normalize(hist, hist).flatten()


def _encode(frame: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(
        ".jpg", _resize(frame, MAX_LONG_SIDE), [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
    )
    if not ok:
        raise ValidationFailed("could not encode a video frame")
    return buf.tobytes()


def extract_keyframes(
    video_path: Path, max_frames: int = MAX_KEYFRAMES, fps: float = 1.0
) -> List[Keyframe]:
    """Return one key frame per scene, in time order, at most `max_frames`.

    Args:
        video_path: stored video upload.
        max_frames: cap on frames returned; when there are more scene changes, the
            biggest changes are kept.
        fps: how many frames per second to look at.

    Raises:
        ValidationFailed: the file cannot be read as a video or has no frames.
    """
    if fps <= 0 or max_frames <= 0:
        raise ValidationFailed("fps and max_frames must be positive")
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValidationFailed("file is not a readable video")
    native_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    step = max(1, round(native_fps / fps))

    # (distance, ts, jpeg); the first frame always counts as a new scene.
    candidates: List[Tuple[float, float, bytes]] = []
    last_hist = None
    index = 0
    try:
        while cap.grab():
            if index % step == 0:
                ok, frame = cap.retrieve()
                if ok:
                    hist = _histogram(frame)
                    dist = (
                        float("inf")
                        if last_hist is None
                        else cv2.compareHist(last_hist, hist, cv2.HISTCMP_BHATTACHARYYA)
                    )
                    if dist > SCENE_CHANGE:
                        candidates.append((dist, index / native_fps, _encode(frame)))
                        last_hist = hist
            index += 1
    finally:
        cap.release()

    if not candidates:
        raise ValidationFailed("video has no readable frames")
    if len(candidates) > max_frames:
        candidates = sorted(candidates, key=lambda c: c[0], reverse=True)[:max_frames]
    frames = [
        Keyframe(ts=round(ts, 2), jpeg_bytes=jpg)
        for _, ts, jpg in sorted(candidates, key=lambda c: c[1])
    ]
    logger.info("keyframes video=%s sampled_every=%d kept=%d", video_path.name, step, len(frames))
    return frames


def _thin(frames: List[Keyframe], n: int) -> List[Keyframe]:
    """Keep n frames spread evenly over the video (first and last included)."""
    if len(frames) <= n:
        return frames
    idx = np.linspace(0, len(frames) - 1, n).round().astype(int)
    return [frames[i] for i in sorted(set(idx.tolist()))]


def _steps_from_transcript(frames: List[Keyframe], transcript: stt.Transcript) -> List[DraftStep]:
    """Offline draft: each step is what was said while that scene was on screen."""
    steps = []
    for i, frame in enumerate(frames):
        end = frames[i + 1].ts if i + 1 < len(frames) else float("inf")
        words = [s.text for s in transcript.segments if frame.ts <= s.start < end]
        if words:
            steps.append(DraftStep(frame_index=i, instruction=" ".join(words)))
    return steps


def _draft(
    frames: List[Keyframe], transcript: Optional[stt.Transcript]
) -> Tuple[str, List[DraftStep], str]:
    """Return (title, steps, mode): vision model first, transcript-only fallback."""
    listing = "\n".join(f"{i}: at {f.ts:.0f} s" for i, f in enumerate(frames))
    spoken = "(no speech)"
    if transcript is not None:
        spoken = "\n".join(f"[{s.start:.0f}-{s.end:.0f} s] {s.text}" for s in transcript.segments)
    prompt = VIDEO_PROMPT.format(frames=listing, transcript=wrap_records([("transcript", spoken)]))
    try:
        draft = llm.vision_json(
            "vision", [f.jpeg_bytes for f in frames], prompt, VideoProcedureDraft
        )
        steps = [s for s in draft.steps if s.frame_index < len(frames) and s.instruction.strip()]
        return draft.title.strip() or OFFLINE_TITLE, steps, "live"
    except ProviderUnavailable:
        if transcript is None or not transcript.segments:
            raise ProviderUnavailable(
                "video needs either the vision model or speech-to-text to draft steps"
            ) from None
        return OFFLINE_TITLE, _steps_from_transcript(frames, transcript), "offline"


def _save_frame(doc_id: int, i: int, frame: Keyframe) -> str:
    folder = Path(get_settings().storage_dir) / "keyframes"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{doc_id}_{i}.jpg"
    path.write_bytes(frame.jpeg_bytes)
    return str(path)


def draft_procedure(
    db: Session, video_path: Path, author_id: int, machine_id: Optional[int]
) -> Procedure:
    """Turn a setup video into a draft procedure (status "draft") for the author to review.

    Steps are ordered by time; each keeps its key frame and the clip range it came from,
    so the new employee can watch exactly that part of the old employee's video.
    Running it again for the same video returns the existing draft.

    Raises:
        ValidationFailed: unreadable video. ProviderUnavailable: no vision and no speech.
    """
    doc = db.execute(select(Document).filter_by(file_path=str(video_path))).scalar_one_or_none()
    if doc is None:
        doc = Document(
            type="video", file_path=str(video_path), uploader_id=author_id, machine_id=machine_id
        )
        db.add(doc)
        db.commit()
    existing = db.execute(select(Procedure).filter_by(source_doc_id=doc.id)).scalars().first()
    if existing is not None:
        return existing

    frames = _thin(extract_keyframes(video_path), VISION_MAX_IMAGES)
    try:
        transcript: Optional[stt.Transcript] = stt.transcribe(video_path)
        doc.text = transcript.text
    except ProviderUnavailable:
        transcript = None
    title, steps, mode = _draft(frames, transcript)
    if not steps:
        raise ValidationFailed("no steps could be drafted from this video")

    proc = Procedure(
        key=f"video-{doc.id}",
        version=1,
        title=title[:200],
        machine_id=machine_id,
        status="draft",
        author_id=author_id,
        source_doc_id=doc.id,
    )
    db.add(proc)
    db.flush()
    steps = sorted(steps, key=lambda s: frames[s.frame_index].ts)
    for no, step in enumerate(steps, start=1):
        frame = frames[step.frame_index]
        nxt = steps[no].frame_index if no < len(steps) else None
        db.add(
            ProcedureStep(
                procedure_id=proc.id,
                step_no=no,
                instruction=step.instruction,
                media_path=_save_frame(doc.id, step.frame_index, frame),
                clip_start=frame.ts,
                clip_end=frames[nxt].ts if nxt is not None else None,
                params=step.params,
                safety=step.safety,
                check_name=step.check_name,
                tolerance_min=step.tolerance_min,
                tolerance_max=step.tolerance_max,
                unit=step.unit,
            )
        )
    fts_index(
        db, "procedure", proc.id, machine_id, " ".join([title] + [s.instruction for s in steps])
    )
    audit(
        db,
        "procedure.drafted",
        actor_id=author_id,
        target_type="procedure",
        target_id=proc.id,
        mode=mode,
        steps=len(steps),
    )
    db.commit()
    logger.info(
        "drafted procedure %s from doc %s (%s, %d steps)", proc.id, doc.id, mode, len(steps)
    )
    return proc
