import client from './client';

/**
 * Capture API client methods.
 * Reference: PRD.md §9.4 and TASKS.md T06/T07/T18.
 */

/**
 * Submit a typed note to extract know-how cards and run Guardian.
 * @param {Object} payload { text, author_id, machine_id, params }
 * @param {AbortSignal} [signal]
 */
export const captureText = (payload, signal) =>
  client.post('/capture/text', payload, { signal }).then((r) => r.data);

/**
 * Upload an audio recording to transcribe and extract know-how cards.
 * @param {FormData} formData Contains file, author_id, machine_id, language, consent
 * @param {AbortSignal} [signal]
 */
export const captureVoice = (formData, signal) =>
  client
    .post('/capture/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    })
    .then((r) => r.data);

/**
 * Upload a setup video to draft a step-by-step procedure.
 * @param {FormData} formData Contains file, author_id, machine_id
 * @param {AbortSignal} [signal]
 */
export const captureVideo = (formData, signal) =>
  client
    .post('/capture/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    })
    .then((r) => r.data);

/**
 * Upload a photo of handwritten notes to extract issues, decisions, and actions.
 * @param {FormData} formData Contains file, uploader_id, machine_id
 * @param {AbortSignal} [signal]
 */
export const captureHandwritten = (formData, signal) =>
  client
    .post('/capture/handwritten', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    })
    .then((r) => r.data);

/**
 * Poll background job status.
 * @param {string} jobId
 * @param {AbortSignal} [signal]
 */
export const getJob = (jobId, signal) =>
  client.get(`/jobs/${jobId}`, { signal }).then((r) => r.data);

/**
 * Helper to poll a background job with exponential backoff until completion.
 * @param {string} jobId
 * @param {Function} [onProgress]
 * @param {number} [maxAttempts=30]
 * @param {number} [baseDelay=1000]
 */
export async function pollJob(jobId, onProgress, maxAttempts = 30, baseDelay = 1000) {
  let attempts = 0;
  let delay = baseDelay;

  while (attempts < maxAttempts) {
    const job = await getJob(jobId);
    if (onProgress) {
      onProgress(job);
    }

    if (job.status === 'done') {
      return job.result;
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'Background job processing failed');
    }

    attempts += 1;
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay * 1.5, 5000); // Backoff capped at 5s
  }

  throw new Error('Background job processing timed out');
}

/**
 * Fetch cards pending verification in the review queue.
 * @param {Object} [params] { limit, offset }
 * @param {AbortSignal} [signal]
 */
export const getReviewQueue = (params, signal) =>
  client.get('/capture/review-queue', { params, signal }).then((r) => r.data);

/**
 * Approve or edit a card in the review queue.
 * @param {number|string} cardId
 * @param {Object} reviewData { reviewer_id, action: 'approve'|'edit'|'reject', action_text, why, symptom }
 * @param {AbortSignal} [signal]
 */
export const reviewCard = (cardId, reviewData, signal) =>
  client.post(`/capture/review/${cardId}`, reviewData, { signal }).then((r) => r.data);

/**
 * Turn a spoken reply into text the speaker can check before sending (nothing is stored).
 * @param {Blob} audioBlob
 * @param {string} [language] 'hi' | 'mr' | 'en'
 * @param {AbortSignal} [signal]
 */
export const transcribe = (audioBlob, language, signal) => {
  const form = new FormData();
  form.append('file', audioBlob, 'reply.webm');
  if (language) form.append('language', language);
  return client
    .post('/capture/transcribe', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    })
    .then((r) => r.data);
};

export default {
  captureText,
  captureVoice,
  captureVideo,
  captureHandwritten,
  getJob,
  pollJob,
  getReviewQueue,
  reviewCard,
  transcribe,
};
