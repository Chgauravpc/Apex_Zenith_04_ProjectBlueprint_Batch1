import axios from 'axios';

/**
 * Standard Axios client for Blueprint API with unified error handling.
 *
 * Locally the API is same-origin (`/api`, proxied by Vite). A deployed frontend sets
 * VITE_API_URL to the backend's address (e.g. https://blueprint-api.onrender.com).
 */
export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const client = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// A free Render backend sleeps when idle and takes ~50 s to wake: start waking it as soon
// as the app opens, so the first real request finds it awake.
if (API_ORIGIN) {
  fetch(`${API_ORIGIN}/api/health`).catch(() => {});
}

/** True for a timeout or no reply at all, which is what a sleeping backend looks like. */
const isWakingUp = (error) => !error.response && ['ECONNABORTED', 'ERR_NETWORK'].includes(error.code);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    // Retry a read once while the backend wakes up. Writes are never repeated automatically.
    if (config && !config._wakeRetry && (config.method || 'get') === 'get' && isWakingUp(error)) {
      config._wakeRetry = true;
      return client(config);
    }

    const errorData = error.response?.data;
    const message =
      errorData?.detail ||
      errorData?.message ||
      error.message ||
      'An unexpected network error occurred';

    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    normalizedError.code = errorData?.code || 'NETWORK_ERROR';
    normalizedError.raw = error;

    return Promise.reject(normalizedError);
  }
);

export default client;
