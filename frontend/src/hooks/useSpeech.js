import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Text-to-Speech hook supporting edge-tts audio files with browser speechSynthesis fallback.
 * Essential for shop-floor hands-free operation in Hindi, Marathi, and English.
 */
export function useSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const speak = (text, lang = 'en', audioUrl = null) => {
    stop();

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        fallbackSpeech(text, lang);
      };
      audio.play().catch(() => fallbackSpeech(text, lang));
      return;
    }

    fallbackSpeech(text, lang);
  };

  const fallbackSpeech = (text, lang) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-US';
    utterance.rate = 0.95;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  return {
    isPlaying,
    speak,
    stop,
  };
}

export default useSpeech;
