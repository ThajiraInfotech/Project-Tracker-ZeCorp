import axios from 'axios';

const getApiUrl = () => {
  let url = import.meta.env.VITE_API_URL || '/api';
  if (url.startsWith('http:')) {
    url = url.replace('http:', 'https:');
  }
  return url;
};

const api = axios.create({
  baseURL: getApiUrl(),
});

// Request interceptor to always read the latest token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;