"""Shop-floor lexicon: symptoms, parameters, machine and component names in en / hi / mr.

Used by the offline extraction fallback, search query expansion and Note Guardian.
Everything is built once at import into dicts/sets, so lookups are O(1) per phrase and
a whole note is scanned in O(phrases + characters).
"""

import re
from typing import Dict, Iterable, List, Mapping, Optional, Set

# Canonical symptom key -> phrases people actually write or say (English, Hindi in
# Devanagari and Latin script, Marathi). Keys match KnowledgeCard.symptom values.
SYMPTOMS: Dict[str, List[str]] = {
    "chatter": [
        "chatter",
        "chattering",
        "chatter marks",
        "चैटर",
        "kaanpna",
        "kanp raha",
        "काँप",
        "कंपन",
        "thartharaat",
        "थरथराहट",
    ],
    "noise": [
        "noise",
        "noisy",
        "sound",
        "whine",
        "knock",
        "awaaz",
        "aawaz",
        "आवाज़",
        "आवाज",
        "shor",
        "शोर",
        "आवाज येत",
    ],
    "vibration": [
        "vibration",
        "vibrating",
        "shaking",
        "imbalance",
        "hil raha",
        "हिल रहा",
        "kampan",
    ],
    "overheating": [
        "overheating",
        "overheat",
        "too hot",
        "hot",
        "warm",
        "garam",
        "गरम",
        "temperature high",
        "तापमान",
        "smoke",
        "dhuan",
        "धुआँ",
    ],
    "dimension_drift": [
        "dimension drift",
        "oversize",
        "undersize",
        "taper",
        "out of tolerance",
        "size badal",
        "साइज",
        "drift",
        "off by",
    ],
    "poor_finish": [
        "poor finish",
        "bad finish",
        "rough surface",
        "surface marks",
        "finish kharab",
        "फिनिश खराब",
        "built-up edge",
        "smeared",
    ],
    "tool_break": [
        "tool break",
        "tool broke",
        "broken tool",
        "insert broke",
        "drill broke",
        "snapped",
        "tool toot",
        "टूल टूट",
        "टूट गया",
        "टूट रहा",
        "टूट रही",
        "breaking",
        "breaks",
    ],
    "coolant_leak": ["coolant leak", "leaking", "leak", "drip", "rissa", "रिसाव", "गळती"],
    "alarm": ["alarm", "error code", "fault", "अलार्म"],
    "burr": ["burr", "burrs", "dhaar", "धार निकली", "sharp edge"],
    "chip_colour": ["blue chips", "chip colour", "chip color", "straw chips", "nili chip"],
}

# Parameter name -> spoken/written aliases. Values are read by PARAM_PATTERN below.
PARAMS: Dict[str, List[str]] = {
    "feed": ["feed", "feed rate", "फीड", "f"],
    "speed": ["speed", "rpm", "spindle speed", "s", "स्पीड"],
    "depth": ["depth", "depth of cut", "doc", "डेप्थ"],
    "spindle_temp": ["spindle temp", "spindle temperature", "temp", "temperature", "तापमान"],
}

_DASHES = re.compile(r"[‐-―_]+")
_PUNCT = re.compile(r"[,;:!?()\[\]{}\"'।|]+")
_SPACES = re.compile(r"\s+")


def normalize(text: str) -> str:
    """Lower-case, unify dashes, turn punctuation into spaces, collapse whitespace."""
    text = _DASHES.sub("-", text.lower())
    text = _PUNCT.sub(" ", text)
    return _SPACES.sub(" ", text).strip()


def _phrase_index(table: Mapping[str, Iterable[str]]) -> Dict[str, str]:
    return {normalize(p): key for key, phrases in table.items() for p in phrases}


_SYMPTOM_PHRASES = _phrase_index(SYMPTOMS)
# Longest phrases first so "chatter marks" wins over "chatter"; built once.
_SYMPTOM_ORDER = sorted(_SYMPTOM_PHRASES, key=len, reverse=True)

_PARAM_ALIAS = _phrase_index(PARAMS)
_ALIAS_ALT = "|".join(re.escape(a) for a in sorted(_PARAM_ALIAS, key=len, reverse=True))
# "feed 0.3", "feed to 0.3", "feed = 0.3", "f0.3", "rpm 9000", "फीड 0.3"
PARAM_PATTERN = re.compile(
    rf"(?<![\w.])({_ALIAS_ALT})\s*(?:to|=|:|of|ko|se|को)?\s*(\d+(?:\.\d+)?)", re.IGNORECASE
)
# "9000 rpm" (number before the unit)
RPM_AFTER = re.compile(r"(\d{3,5})\s*rpm\b", re.IGNORECASE)


def _contains(haystack: str, phrase: str) -> bool:
    """Whole-phrase match. Latin phrases need word boundaries; Devanagari ones do not
    (suffixes like ने/से attach to the word)."""
    if phrase.isascii():
        return re.search(rf"(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])", haystack) is not None
    return phrase in haystack


def find_symptoms(text: str) -> Set[str]:
    """Canonical symptom keys mentioned in `text` (any supported language)."""
    norm = normalize(text)
    return {_SYMPTOM_PHRASES[p] for p in _SYMPTOM_ORDER if _contains(norm, p)}


def find_params(text: str) -> Dict[str, float]:
    """Numeric parameters mentioned in `text`, e.g. {"feed": 0.3, "speed": 9000.0}.

    The last mention of a parameter wins ("feed 0.2 ... increased feed to 0.3" → 0.3).
    """
    norm = normalize(text)
    found: Dict[str, float] = {}
    for alias, value in PARAM_PATTERN.findall(norm):
        found[_PARAM_ALIAS[alias.lower()]] = float(value)
    for value in RPM_AFTER.findall(norm):
        found["speed"] = float(value)
    return found


def _machine_key(name: str) -> str:
    return re.sub(r"[\s\-]+", "", name.lower())


def match_machine(text: str, machine_names: Iterable[str]) -> Optional[str]:
    """Return the machine name written in `text` ("vmc 3", "VMC3", "vmc-3" → "VMC-3")."""
    squashed = _machine_key(text)
    # Longest names first so "VMC-31" is not read as "VMC-3".
    for name in sorted(machine_names, key=len, reverse=True):
        key = _machine_key(name)
        idx = squashed.find(key)
        if idx >= 0 and not squashed[idx + len(key) : idx + len(key) + 1].isdigit():
            return name
    return None


def match_components(text: str, aliases: Mapping[int, Iterable[str]]) -> List[int]:
    """IDs of components whose alias appears in `text` (aliases from Component.aliases)."""
    norm = normalize(text)
    return [
        cid for cid, names in aliases.items() if any(_contains(norm, normalize(a)) for a in names)
    ]


def expand_query(text: str) -> List[str]:
    """Synonyms of every symptom in `text`, for search (e.g. Hindi query finds English cards)."""
    terms: List[str] = []
    for key in sorted(find_symptoms(text)):
        terms.extend(SYMPTOMS[key])
    return terms
