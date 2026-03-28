import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL:         API_URL,
  headers:         { 'Content-Type': 'application/json' },
  timeout:         20000,
  withCredentials: false,
});

// ── Request: attach access token ───────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Token refresh queue ────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

const clearAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (!window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/register')) {
    window.location.href = '/login';
  }
};

// i18n-aware error message helper (safe for non-React context)
const getMsg = (key, fallback) => {
  try { return window.__i18n__?.t(key) || fallback; }
  catch { return fallback; }
};

// ── Response: global error handler ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (!error.response) {
      if (!original?._silent) toast.error(getMsg('errors.network', 'Connection failed'));
      return Promise.reject(error);
    }

    const { status } = error.response;

    if (status === 401 && !original._retry) {
      if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
        clearAuth();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch(err => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing    = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error, null);
        clearAuth();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem('accessToken', accessToken);
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuth();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 403 && !original?._silent)
      toast.error(getMsg('errors.forbidden', "You don't have permission"));

    if (status >= 500 && !original?._silent)
      toast.error(getMsg('errors.serverError', 'Server error. Please try again'));

    return Promise.reject(error);
  }
);

export default api;
