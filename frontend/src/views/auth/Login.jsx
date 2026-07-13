import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoUnefa from '../../assets/img/logo_unefa.png';
import './Login.css';

/**
 * Login - Componente de autenticación
 */
function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, getRol, loading } = useAuth();

  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRedirectRoute = (rol) => {
    return rol === 'PROFESOR' ? '/profesor-dashboard' : '/dashboard';
  };

  useEffect(() => {
    if (isAuthenticated()) {
      const rol = getRol();
      navigate(getRedirectRoute(rol), { replace: true });
    }
  }, [isAuthenticated, getRol, navigate]);

  const validateForm = () => {
    if (!cedula.trim()) {
      setError('Por favor ingresa tu cédula');
      return false;
    }
    if (!password) {
      setError('Por favor ingresa tu contraseña');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await login(cedula.trim(), password);

      if (result.success) {
        console.log('[INFO] Login exitoso, redirigiendo...');
        navigate(getRedirectRoute(result.usuario.rol), { replace: true });
      } else {
        const errorMsg = result.error || 'Error desconocido en la autenticación';
        setError(errorMsg);
        console.error('[ERROR] Login falló:', errorMsg);
      }
    } catch (err) {
      const errorMsg = `Error inesperado: ${err.message}`;
      setError(errorMsg);
      console.error('[ERROR] Excepción en handleSubmit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mockup-page-wrapper d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mockup-page-wrapper">
      {/* BARRA SUPERIOR */}
      <header className="mockup-top-bar">
        <div className="mockup-brand">
          <img src={logoUnefa} alt="Logo UNEFA" className="mockup-header-logo" />
          <span className="mockup-header-text">BANDWAR</span>
        </div>
      </header>

      {/* ÁREA CENTRAL DE LOGEO */}
      <main className="mockup-main-content">
        <div className="card mockup-login-card">
          {/* Cabecera interna de la tarjeta */}
          <div className="mockup-card-header">
            <div className="d-flex align-items-center">
              <img src={logoUnefa} alt="Shield" className="mockup-card-logo" />
              <span className="mockup-card-title">BANDWAR</span>
            </div>
            <div className="mockup-card-subtitle">INICIAR SESIÓN</div>
          </div>

          {/* Cuerpo del Formulario */}
          <div className="card-body p-4">
            {/* Visualización de errores */}
            {error && (
              <div
                className="alert alert-danger py-2 px-3 mb-3 small text-center rounded-1"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Input: Usuario */}
              <div className="mb-3">
                <label htmlFor="cedula" className="form-label">
                  Cédula
                </label>
                <input
                  id="cedula"
                  type="text"
                  className="form-control"
                  placeholder="Ej: 12345678"
                  value={cedula}
                  onChange={(e) => {
                    setCedula(e.target.value);
                    setError(''); // Limpiar error al escribir
                  }}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Input: Contraseña */}
              <div className="mb-4">
                <label htmlFor="password" className="form-label">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(''); // Limpiar error al escribir
                  }}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Botón Submit */}
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>
          </div>

          {/* Pie de la tarjeta */}
          <div className="card-footer bg-light text-center py-3">
            <small className="text-muted">
              © 2026 Bandwar - Sistema de Gestion de Aprendizaje Universitario
            </small>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;