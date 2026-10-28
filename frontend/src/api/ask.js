import client from './client';

/**
 * Ask Experience API functions (Lane 2).
 * Reference: PRD.md §9.3, §9.4 and TASKS.md T10, T13, T14, T20.
 */

/**
 * Submit text query to grounded Q&A engine.
 * @param {Object} payload { question, machine_id, component_id, language }
 * @param {AbortSignal} [signal]
 */
export const askQuestion = (payload, signal) =>
  client.post('/ask', payload, { signal }).then((r) => r.data);

/**
 * Submit spoken voice query in Hindi, Marathi, or English.
 * @param {FormData} formData
 * @param {AbortSignal} [signal]
 */
export const askVoice = (formData, signal) =>
  client
    .post('/ask/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000, // speech-to-text, AI and Guardian in one request
      signal,
    })
    .then((r) => r.data);

/**
 * Upload machining sound sample to diagnose chatter and calculate stable RPMs.
 * @param {FormData} formData
 * @param {AbortSignal} [signal]
 */
export const askChatter = (formData, signal) =>
  client
    .post('/ask/chatter', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    })
    .then((r) => r.data);

/**
 * Upload chip photo to classify colour and diagnose cutting temperature.
 * @param {FormData} formData
 * @param {AbortSignal} [signal]
 */
export const askChips = (formData, signal) =>
  client
    .post('/ask/chips', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    })
    .then((r) => r.data);

/**
 * Submit user feedback (helpful / unhelpful) for grounding quality.
 * @param {number|string} queryId
 * @param {Object} feedback { helpful: boolean, note?: string }
 */
export const submitFeedback = (queryId, feedback) =>
  client.post(`/ask/${queryId}/feedback`, feedback).then((r) => r.data);

export default {
  askQuestion,
  askVoice,
  askChatter,
  askChips,
  submitFeedback,
};
