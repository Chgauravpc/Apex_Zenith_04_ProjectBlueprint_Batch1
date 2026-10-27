import axios from 'axios';

/**
 * Standard Axios client for Blueprint API with unified error handling.
 */
const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
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
