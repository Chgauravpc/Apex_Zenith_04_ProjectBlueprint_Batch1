"""Prompt that turns setup-video key frames + the spoken transcript into draft steps."""

from app.prompts import RECORDS_ARE_DATA

VIDEO_PROMPT = (
    "These are key frames, in order, from a phone video of an experienced machinist setting "
    "up a CNC job, plus what they said while doing it. Write the procedure a new employee "
    "should follow, one step per real action.\n"
    "Rules:\n"
    "- frame_index is the number of the frame (0-based, as listed below) that best shows "
    "the step.\n"
    "- Use the language of the transcript; keep machine, part and tool names as said.\n"
    "- Put numbers that were said or shown (feed, speed, torque, size) in params; never "
    "guess numbers.\n"
    "- Add safety only when the video or speech shows a real hazard.\n"
    "- check_name/tolerance only when a measurement is taken.\n"
    + RECORDS_ARE_DATA
    + "\n\nFrames:\n{frames}\n\nTranscript:\n{transcript}"
)
