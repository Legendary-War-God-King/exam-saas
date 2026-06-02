import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 防止多个 401 并发刷新：只允许一个 refresh 在进行，其他请求等待
let refreshing: Promise<string> | null = null;
const waitQueue: Array<(token: string) => void> = [];

async function doRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('no refresh token');
  // 走原始 axios（不走带拦截器的 api 实例，避免死循环）
  const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
  const { accessToken, refreshToken: newRefresh } = res.data as {
    accessToken: string;
    refreshToken: string;
  };
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefresh);
  return accessToken;
}

function enqueueWaiter(): Promise<string> {
  return new Promise((resolve) => {
    waitQueue.push(resolve);
  });
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const isAuthEndpoint = original?.url?.includes('/auth/');

    // 401 且非 refresh 请求且未重试过
    if (error.response?.status === 401 && !isAuthEndpoint && !original._retried) {
      original._retried = true;

      if (!refreshing) {
        refreshing = doRefresh()
          .then((token) => {
            // 唤醒所有等待者
            waitQueue.splice(0).forEach((fn) => fn(token));
            return token;
          })
          .catch((err) => {
            // 唤醒并 reject
            waitQueue.splice(0).forEach((fn) => fn(''));
            throw err;
          })
          .finally(() => {
            refreshing = null;
          });
      }

      try {
        const newToken = await (refreshing ?? enqueueWaiter());
        if (!newToken) throw new Error('refresh failed');
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    // refresh 自己失败 → 强制登出
    if (error.response?.status === 401 && isAuthEndpoint && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;
