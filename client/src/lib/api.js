import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const api = axios.create({ baseURL: API_BASE, withCredentials: true });

/** Always throw a readable message from the API's { message } shape. */
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.message || (err.code === 'ERR_NETWORK' ? "Can't reach EmployHunt. Check your connection." : err.message);
    const e = new Error(msg);
    e.status = err.response?.status;
    e.fields = err.response?.data?.fields;
    return Promise.reject(e);
  }
);

export const get = (url, params) => api.get(url, { params }).then((r) => r.data);
export const post = (url, body, config) => api.post(url, body, config).then((r) => r.data);
export const patch = (url, body) => api.patch(url, body).then((r) => r.data);
export const put = (url, body) => api.put(url, body).then((r) => r.data);
export const del = (url, body) => api.delete(url, { data: body }).then((r) => r.data);
