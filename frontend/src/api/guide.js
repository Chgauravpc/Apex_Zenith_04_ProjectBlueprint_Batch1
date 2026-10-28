import client from './client';

/**
 * Guided Job & Procedure API methods (Lane 3).
 * Reference: PRD.md §9.4 and TASKS.md T16, T17, T22.
 */

/**
 * Fetch available machining procedures.
 * @param {Object} [params] { machine_id, status }
 * @param {AbortSignal} [signal]
 */
export const getProcedures = (params, signal) =>
  client.get('/guide/procedures', { params, signal }).then((r) => r.data);

/**
 * Fetch single procedure with detailed steps.
 * @param {number|string} id
 * @param {AbortSignal} [signal]
 */
export const getProcedure = (id, signal) =>
  client.get(`/guide/procedures/${id}`, { signal }).then((r) => r.data);

/**
 * Start a guided run for an operator.
 * @param {Object} payload { employee_id, work_order_id, procedure_id }
 * @param {AbortSignal} [signal]
 */
export const startRun = (payload, signal) =>
  client.post('/guide/runs', payload, { signal }).then((r) => r.data);

/**
 * Record a step's execution with parameter measurement and Guardian tolerance check.
 * @param {number|string} runId
 * @param {Object} stepData { step_no, value, notes }
 * @param {AbortSignal} [signal]
 */
export const recordStep = (runId, stepData, signal) =>
  client.post(`/guide/runs/${runId}/steps`, stepData, { signal }).then((r) => r.data);

/**
 * Fetch skill level for an employee on a machine/operation.
 * @param {number|string} employeeId
 * @param {AbortSignal} [signal]
 */
export const getSkills = (employeeId, signal) =>
  client.get(`/guide/skills/${employeeId}`, { signal }).then((r) => r.data);

/**
 * Fetch symptom -> cause -> fix troubleshooting decision tree.
 * @param {number|string} machineId
 * @param {AbortSignal} [signal]
 */
export const getTroubleshoot = (machineId, signal) =>
  client.get(`/guide/troubleshoot/${machineId}`, { signal }).then((r) => r.data);

/**
 * Fetch ShadowTrace video sync references for a procedure.
 * @param {number|string} procedureId
 * @param {AbortSignal} [signal]
 */
export const getShadowTrace = (procedureId, signal) =>
  client.get(`/guide/shadowtrace/${procedureId}`, { signal }).then((r) => r.data);

/**
 * Fetch a new employee's daily briefing (jobs, known issues, quiz, learning path).
 * @param {number|string} employeeId
 * @param {AbortSignal} [signal]
 */
export const getBriefing = (employeeId, signal) =>
  client.get(`/guide/briefing/${employeeId}`, { signal }).then((r) => r.data);

export default {
  getProcedures,
  getProcedure,
  startRun,
  recordStep,
  getSkills,
  getTroubleshoot,
  getShadowTrace,
  getBriefing,
};
