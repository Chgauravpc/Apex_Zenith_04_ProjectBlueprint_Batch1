import client from './client';

/**
 * Transfer Engine API methods.
 * Reference: PRD.md §9.4 and TASKS.md T11, T23.
 */

/**
 * Fetch handover plan for an old employee facing retirement/exit.
 * @param {number|string} employeeId
 * @param {AbortSignal} [signal]
 */
export const getHandoverPlan = (employeeId, signal) =>
  client.get(`/transfer/handover/${employeeId}`, { signal }).then((r) => r.data);

/**
 * Start an AI-driven interview session to uncover tacit knowledge.
 * @param {Object} payload { employee_id, machine_id, component_id }
 * @param {AbortSignal} [signal]
 */
export const startInterview = (payload, signal) =>
  client.post('/transfer/interview/start', payload, { signal }).then((r) => r.data);

/**
 * Submit spoken or written answer to an interview question.
 * @param {number|string} sessionId
 * @param {Object} answerData { question_id, answer_text, audio_url }
 * @param {AbortSignal} [signal]
 */
export const answerInterview = (sessionId, answerData, signal) =>
  client
    .post(`/transfer/interview/${sessionId}/answer`, answerData, { signal })
    .then((r) => r.data);

/**
 * Fetch unanswered shop-floor questions routed to an old employee.
 * @param {Object} [params] { employee_id, status }
 * @param {AbortSignal} [signal]
 */
export const getRoutedQuestions = (params, signal) =>
  client.get('/transfer/routed-questions', { params, signal }).then((r) => r.data);

/**
 * Old employee replies to a routed question (reply turns into verified card).
 * @param {number|string} questionId
 * @param {Object} replyData { reply_text, author_id }
 * @param {AbortSignal} [signal]
 */
export const replyRoutedQuestion = (questionId, replyData, signal) =>
  client
    .post(`/transfer/routed-questions/${questionId}/reply`, replyData, { signal })
    .then((r) => r.data);

/**
 * Fetch knowledge risk matrix & bus factor breakdown.
 * @param {AbortSignal} [signal]
 */
export const getRisk = (signal) =>
  client.get('/transfer/risk', { signal }).then((r) => r.data);

export default {
  getHandoverPlan,
  startInterview,
  answerInterview,
  getRoutedQuestions,
  replyRoutedQuestion,
  getRisk,
};
