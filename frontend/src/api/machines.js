import client from './client';

/**
 * Machines and their unified timeline.
 * Reference: PRD.md §9.4 (machines.py) and TASKS.md T24.
 */

/**
 * Fetch all machines from the ERP.
 * @param {AbortSignal} [signal]
 */
export const getMachines = (signal) =>
  client.get('/machines', { signal }).then((r) => r.data);

/**
 * Fetch one machine's events, newest first.
 * @param {number|string} machineId
 * @param {Object} [params] { limit, offset }
 * @param {AbortSignal} [signal]
 */
export const getTimeline = (machineId, params, signal) =>
  client.get(`/machines/${machineId}/timeline`, { params, signal }).then((r) => r.data);

export default {
  getMachines,
  getTimeline,
};
