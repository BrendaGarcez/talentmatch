import axios from 'axios';

const api = axios.create({
  // No Vite, usamos import.meta.env em vez de process.env
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Interceptor preparado para futura integração com Senior X
api.interceptors.request.use((config) => {
  // config.headers['client_id'] = 'seu_id_aqui'; //
  return config;
});

export default api;