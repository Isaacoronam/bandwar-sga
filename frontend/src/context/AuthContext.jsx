import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosConfig';

/**
 * @fileoverview AuthContext - Contexto centralizado para gestión de autenticación JWT
 * 
 * Funcionalidades:
 * - Autenticación con tokens JWT (access/refresh)
 * - Persistencia en localStorage
 * - Recuperación automática de sesión
 * - Manejo defensivo de errores
 */

const AuthContext = createContext(null);

/**
 * @constant STORAGE_KEYS - Constantes para localStorage
 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USUARIO: 'usuario',
};

/**
 * @constant API_ENDPOINTS - URLs base para API
 */
// Use centralized `api` (axios) with baseURL configured in `axiosConfig.js`

/**
 * StorageManager - Helper para manejo seguro de localStorage
 */
const StorageManager = {
  save: (token, refreshToken, usuario) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuario));
    } catch (err) {
      console.error(`[ERROR] [${new Date().toISOString()}]: StorageManager.save falló:`, err.message);
    }
  },
  load: () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const usuario = localStorage.getItem(STORAGE_KEYS.USUARIO);

      if (!token || !usuario) return null;

      return {
        token,
        usuario: JSON.parse(usuario),
      };
    } catch (err) {
      console.error(`[ERROR] [${new Date().toISOString()}]: StorageManager.load falló:`, err.message);
      StorageManager.clear();
      return null;
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USUARIO);
    } catch (err) {
      console.warn(`[ERROR] [${new Date().toISOString()}]: StorageManager.clear falló:`, err.message);
    }
  },
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const data = StorageManager.load();
      if (data) {
        setToken(data.token);
        setUsuario(data.usuario);
      }
    } catch (err) {
      console.error(`[ERROR] [${new Date().toISOString()}]: Recuperación de sesión falló:`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (cedula, password) => {
    setError(null);

    if (!cedula || !password) {
      const msg = 'Cédula y contraseña son requeridos';
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      const response = await api.post('/api/login/', { cedula, password });
      const data = response.data;

      if (!data || !data.access || !data.usuario) {
        const msg = 'Respuesta del servidor inválida';
        setError(msg);
        console.error(`[ERROR] [${new Date().toISOString()}]: Respuesta malformada:`, data);
        return { success: false, error: msg };
      }

      // 🔍 VALIDACIÓN CRÍTICA PARA ESTUDIANTES: instructor_encargado
      if (data.usuario.rol === 'ESTUDIANTE') {
        if (!data.usuario.instructor_encargado || !data.usuario.instructor_encargado.id) {
          console.warn(
            `⚠️  [VALIDACIÓN CRÍTICA] Estudiante ${data.usuario.cedula} logueado SIN instructor_encargado`,
            {
              usuario_cedula: data.usuario.cedula,
              usuario_nombre: data.usuario.nombre,
              instructor_encargado: data.usuario.instructor_encargado,
              instructor_id: data.usuario.instructor_encargado?.id,
            }
          );
        } else {
          console.log(
            `✅ Estudiante con instructor asignado:`,
            {
              estudiante: `${data.usuario.nombre} ${data.usuario.apellido}`,
              instructor: `${data.usuario.instructor_nombre}`,
              instructor_id: data.usuario.instructor_id,
            }
          );
        }
      }

      StorageManager.save(data.access, data.refresh, data.usuario);
      setToken(data.access);
      setUsuario(data.usuario);

      console.log(`[INFO] [${new Date().toISOString()}]: Login exitoso para usuario:`, {
        email: data.usuario.email,
        cedula: data.usuario.cedula,
        rol: data.usuario.rol,
      });
      return { success: true, usuario: data.usuario };
    } catch (err) {
      let errorMsg = 'Error de conexión con el servidor';

      if (err.response && err.response.data) {
        errorMsg = err.response.data.detail || err.response.data.error || errorMsg;
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
      console.error(`[ERROR] [${new Date().toISOString()}]: Excepción en login:`, err);
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    try {
      StorageManager.clear();
      setToken(null);
      setUsuario(null);
      setError(null);
      console.log(`[INFO] [${new Date().toISOString()}]: Logout exitoso`);
    } catch (err) {
      console.error(`[ERROR] [${new Date().toISOString()}]: Logout falló:`, err);
    }
  };

  const updateUsuario = (usuarioActualizado) => {
    try {
      setUsuario(usuarioActualizado);
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (accessToken) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      }
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(usuarioActualizado));
    } catch (err) {
      console.error(`[ERROR] [${new Date().toISOString()}]: updateUsuario falló:`, err.message);
    }
  };

  const isAuthenticated = () => token !== null && usuario !== null;
  const getRol = () => usuario?.rol || null;

  const value = {
    usuario,
    token,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    getRol,
    updateUsuario,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
