import { describe, it, expect } from 'vitest';
import { encodeWav } from './audio';

const readBytes = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new DataView(reader.result));
    reader.readAsArrayBuffer(blob);
  });

describe('encodeWav', () => {
  it('writes a 16-bit mono PCM WAV the backend can read', async () => {
    const blob = encodeWav(new Float32Array([0, 0.5, -1, 2]), 16000);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + 4 * 2);
    const v = await readBytes(blob);
    const tag = (o) => String.fromCharCode(...[0, 1, 2, 3].map((i) => v.getUint8(o + i)));
    expect([tag(0), tag(8), tag(12), tag(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect(v.getUint16(20, true)).toBe(1); // PCM
    expect(v.getUint16(22, true)).toBe(1); // mono
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint16(34, true)).toBe(16);
    expect([1, 2, 3].map((i) => v.getInt16(44 + i * 2, true))).toEqual([16383, -32768, 32767]); // clipped
  });
});
