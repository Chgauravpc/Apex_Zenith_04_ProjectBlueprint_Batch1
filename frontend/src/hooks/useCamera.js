import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook for camera stream and photo capture for handwritten notes and chip inspection.
 */
export function useCamera() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const cleanup = useCallback(() => {
    stopCamera();
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }
  }, [stopCamera, photoUrl]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const startCamera = async (facingMode = 'environment') => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);
    } catch (err) {
      console.error('Camera initialization failed:', err);
      setError(err.message || 'Camera permission was denied or camera is unavailable.');
      setIsStreaming(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !isStreaming) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setPhotoBlob(blob);
            if (photoUrl) URL.revokeObjectURL(photoUrl);
            const url = URL.createObjectURL(blob);
            setPhotoUrl(url);
            stopCamera();
            resolve(blob);
          } else {
            resolve(null);
          }
        },
        'image/jpeg',
        0.92
      );
    });
  };

  const resetPhoto = () => {
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
    }
    setPhotoBlob(null);
    setError(null);
  };

  return {
    videoRef,
    isStreaming,
    photoBlob,
    photoUrl,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    resetPhoto,
  };
}

export default useCamera;
