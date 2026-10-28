import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import client from './client';

/** Adapter that plays back `replies` in order: an object is a response, a string an error code. */
const scripted = (replies, seen) => (config) => {
  seen.push(config.method);
  const reply = replies.shift();
  if (typeof reply === 'string') {
    const error = new Error(reply === 'ECONNABORTED' ? 'timeout of 30000ms exceeded' : 'Network Error');
    error.code = reply;
    error.config = config;
    return Promise.reject(error);
  }
  return Promise.resolve({ data: reply, status: 200, statusText: 'OK', headers: {}, config });
};

describe('api client', () => {
  const original = client.defaults.adapter;
  let seen;

  beforeEach(() => {
    seen = [];
  });
  afterEach(() => {
    client.defaults.adapter = original;
  });

  it('calls the same-origin /api when no backend URL is configured', () => {
    expect(client.defaults.baseURL).toBe('/api');
  });

  it('retries a read once while a sleeping backend wakes up', async () => {
    client.defaults.adapter = scripted(['ECONNABORTED', { status: 'ok' }], seen);
    const res = await client.get('/health');
    expect(res.data).toEqual({ status: 'ok' });
    expect(seen).toEqual(['get', 'get']);
  });

  it('gives up after one retry with a readable error', async () => {
    client.defaults.adapter = scripted(['ERR_NETWORK', 'ERR_NETWORK'], seen);
    await expect(client.get('/machines')).rejects.toMatchObject({
      message: 'Network Error',
      code: 'NETWORK_ERROR',
    });
    expect(seen).toEqual(['get', 'get']);
  });

  it('never repeats a write automatically', async () => {
    client.defaults.adapter = scripted(['ECONNABORTED'], seen);
    await expect(client.post('/capture/text', { text: 'x' })).rejects.toThrow(/timeout/);
    expect(seen).toEqual(['post']);
  });
});
