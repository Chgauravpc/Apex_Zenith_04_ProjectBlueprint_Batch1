"""Setup video → key frames (and, next, a draft step-by-step procedure).

Key frames: sample the video at `fps`, compare each sample's colour histogram with the
last key frame, and keep frames where the scene changed. Only sampled frames are decoded
(`grab()` skips the rest cheaply), so the cost is O(frames) with O(1) frames in memory
besides the kept JPEGs.
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np

from app.errors import ValidationFailed

logger = logging.getLogger(__name__)

MAX_KEYFRAMES = 30  # most the vision LLM is sent (ENGINEERING.md §4)
MAX_LONG_SIDE = 1280  # px, key frames are resized before storing/sending
HIST_SIDE = 160  # px, small copy used only for the histogram (fast, noise-tolerant)
HIST_BINS = [32, 32]  # hue × saturation
SCENE_CHANGE = 0.35  # Bhattacharyya distance above which a new scene starts (0 = same)
JPEG_QUALITY = 85


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
