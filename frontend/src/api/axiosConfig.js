import axios from 'axios';

/**
 * Configuración centralizada del cliente HTTP para Bandwar.
 * Proporciona autenticación JWT, renovación de sesión y manejo defensivo de errores.
 * @module api/axiosConfig
 */

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://bandwarbackend2-h9g58o78.b4a.run' : 'http://localhost:8000');

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USUARIO: 'usuario',
};

const getAccessToken = () => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
const getRefreshToken = () => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

/**
 * Registra un error con formato estructurado compatible con la trazabilidad del MVP.
 * @param {string} message - Mensaje de error a registrar.
 */
const logStructuredError = (message) => {
  try {
    const timestamp = new Date().toISOString().slice(0, 10);
    console.error(`[ERROR] [${timestamp}]: ${message}`);
  } catch (error) {
    console.error('[ERROR] [UNKNOWN]: No se pudo registrar el error estructurado.');
  }
};

const clearSessionAndRedirect = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USUARIO);
  } catch (err) {
    logStructuredError(`No se pudo limpiar el almacenamiento local antes de redirigir: ${err?.message || err}`);
  }

  window.location.href = '/login';
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logStructuredError(`Fallo en la solicitud HTTP: ${error?.message || error}`);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(
            `${API_URL}/api/token/refresh/`,
            { refresh: refreshToken },
            { headers: { 'Content-Type': 'application/json' } },
          );

          const newAccessToken = refreshResponse.data?.access;
          if (newAccessToken) {
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
            api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          logStructuredError(`No se pudo renovar el token JWT: ${refreshError?.message || refreshError}`);
          clearSessionAndRedirect();
          return Promise.reject(refreshError);
        }
      }

      clearSessionAndRedirect();
    }

    logStructuredError(`Respuesta HTTP con error ${error?.response?.status || 'desconocido'}: ${error?.message || error}`);
    return Promise.reject(error);
  },
);

export default api;
