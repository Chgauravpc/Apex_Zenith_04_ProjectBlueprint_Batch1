import { useEffect, useState } from 'react';
import useRecorder from './useRecorder';
import { transcribe } from '../api/capture';

/**
 * Record a spoken answer and turn it into text with Whisper, so the speaker can
 * check and correct it before sending. `onText` receives the transcript.
 * `language` ('hi' / 'mr') is a hint for Whisper; with English or none it detects the language,
 * because shop-floor answers are often Hindi or Marathi whatever the screen language is.
 */
export function useDictation(onText, language) {
  const recorder = useRecorder();
  const { audioBlob, resetRecording } = recorder;
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [dictationError, setDictationError] = useState(null);

  useEffect(() => {
    if (!audioBlob) return;
    let cancelled = false;
    setIsTranscribing(true);
    setDictationError(null);
    transcribe(audioBlob, language === 'hi' || language === 'mr' ? language : undefined)
      .then((res) => {
        if (cancelled) return;
        if (res.mode === 'offline' || !res.text) {
          setDictationError('Speech-to-text is not available right now. Please type your answer.');
        } else {
          onText(res.text);
        }
      })
      .catch((err) => {
        if (!cancelled) setDictationError(err.message || 'Could not read the recording.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsTranscribing(false);
          resetRecording();
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  return { ...recorder, isTranscribing, dictationError };
}

export default useDictation;
