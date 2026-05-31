import axios from 'axios';

const studentApi = axios.create({ baseURL: '/api/v1' });

studentApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('studentToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

studentApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('studentToken');
      if (typeof window !== 'undefined') window.location.href = '/exam';
    }
    return Promise.reject(error);
  },
);

export default studentApi;
