import client from './client';

/**
 * Note Guardian API functions.
 * Reference: PRD.md §9.4 and ENGINEERING.md §9.4.
 */

/**
 * Save note and run Guardian safety checks.
 * @param {Object} note { machine_id, author_id, text, params, symptoms }
 * @param {AbortSignal} [signal]
 */
export const saveNote = (note, signal) =>
  client.post('/guardian/notes', note, { signal }).then((r) => r.data);

/**
 * Fetch open warnings, optionally filtered by machine.
 * @param {number} [machineId]
 * @param {AbortSignal} [signal]
 */
export const getWarnings = (machineId, signal) =>
  client
    .get('/guardian/warnings', {
      params: machineId ? { machine_id: machineId } : {},
      signal,
    })
    .then((r) => r.data);

/**
 * Respond to a warning (acknowledge or override with rationale).
 * @param {number} warningId
 * @param {Object} response { action: 'acknowledge' | 'override', reason?: string }
 */
export const respondWarning = (warningId, response) =>
  client
    .post(`/guardian/warnings/${warningId}/respond`, response)
    .then((r) => r.data);

export default {
  saveNote,
  getWarnings,
  respondWarning,
};
