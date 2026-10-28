/**
 * Browser recordings are WebM/Opus or MP4/AAC, which the chatter analysis (libsndfile, no
 * ffmpeg on the server) cannot read. Decode them here with the Web Audio API and re-encode
 * as a 16-bit mono WAV, which every backend reader understands.
 */

/** PCM samples (Float32Array, -1..1) → WAV Blob, 16-bit mono. */
export function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset, s) => [...s].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes per second
  view.setUint16(32, 2, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => {
    const v = Math.max(-1, Math.min(1, s));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  });
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Any recording the browser can play → WAV Blob (channels mixed down to mono). */
export async function toWav(blob) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error('this browser cannot convert the recording; upload a WAV file instead');
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const mono = new Float32Array(decoded.length);
    for (let ch = 0; ch < decoded.numberOfChannels; ch += 1) {
      decoded.getChannelData(ch).forEach((v, i) => {
        mono[i] += v / decoded.numberOfChannels;
      });
    }
    return encodeWav(mono, decoded.sampleRate);
  } finally {
    ctx.close();
  }
}
