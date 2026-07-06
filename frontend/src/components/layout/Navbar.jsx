import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ModalEnDesarrollo from '../ModalEnDesarrollo'; // Ajusta la ruta si lo guardaste en otra carpeta
import logoUnefa from '../../assets/img/logo_unefa.png';
import './Navbar.css';

/**
 * Navbar - Barra de navegación principal condicional por roles
 */
function Navbar() {
  const { usuario, getRol, logout } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const rol = getRol();
  const fullName = usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario';

  const handleLogout = () => {
    try {
      logout();
      console.log('[INFO] Usuario desconectado correctamente');
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[ERROR] Error en logout:', err);
      navigate('/', { replace: true });
    }
  };

  const navLinkClass = ({ isActive }) =>
    isActive ? 'nav-link active fw-bold text-warning' : 'nav-link text-white transition-hover';

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm border-0">
        <div className="container-fluid px-4">
          {/* Logo y Enlace Principal dinámico según rol */}
          <NavLink 
            className="navbar-brand d-flex align-items-center gap-2" 
            to={rol === 'PROFESOR' ? '/profesor-dashboard' : '/dashboard'}
          >
            <img src={logoUnefa} alt="UNEFA Logo" className="navbar-logo" />
            <span className="text-warning fw-bold">Bandwar</span>
          </NavLink>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarContent"
            aria-controls="navbarContent"
            aria-expanded="false"
            aria-label="Alternar navegación"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="navbarContent">
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0 align-items-lg-center">
              
              {/* Enlaces comunes para TODOS los usuarios */}
              <li className="nav-item">
                <NavLink to="/historia-banda" className={navLinkClass}>
                  Historia de la Banda
                </NavLink>
              </li>

              <li className="nav-item">
                <button
                  type="button"
                  className="nav-link btn btn-link text-white px-2 transition-hover text-decoration-none"
                  onClick={() => setShowModal(true)}
                >
                  Biblioteca Multimedia
                </button>
              </li>

              {/* Enlaces EXCLUSIVOS para ESTUDIANTES */}
              {rol === 'ESTUDIANTE' && (
                <>
                  <li className="nav-item">
                    <NavLink to="/estudiante/orden-cerrado" className={navLinkClass}>
                      Orden Cerrado 3D
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/estudiante/evaluaciones" className={navLinkClass}>
                      Mis Evaluaciones
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/estudiante/notas" className={navLinkClass}>
                      Mis Calificaciones
                    </NavLink>
                  </li>
                </>
              )}

              {/* Enlaces EXCLUSIVOS para PROFESORES */}
              {rol === 'PROFESOR' && (
                <li className="nav-item">
                  <NavLink to="/profesor-dashboard" className={navLinkClass}>
                    Panel de Control
                  </NavLink>
                </li>
              )}
            </ul>

            {/* Menú de Usuario (Derecha) */}
            <ul className="navbar-nav ms-lg-3 align-items-center">
              <li className="nav-item dropdown">
                <button
                  className="nav-link dropdown-toggle btn btn-link text-white d-flex align-items-center gap-2 text-decoration-none"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  type="button"
                >
                  <i className="bi bi-person-circle"></i>
                  <span className="fw-semibold">{fullName}</span>
                </button>
                <ul
                  className="dropdown-menu dropdown-menu-end bg-dark border border-secondary shadow"
                  aria-labelledby="userDropdown"
                >
                  <li>
                    <NavLink
                      to="/perfil"
                      className="dropdown-item text-white text-decoration-none"
                    >
                      <i className="bi bi-person-badge me-2"></i>Mi Perfil
                    </NavLink>
                  </li>
                  <li><hr className="dropdown-divider border-secondary" /></li>
                  <li>
                    <button
                      type="button"
                      className="dropdown-item text-danger fw-bold"
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
                    </button>
                  </li>
                </ul>
              </li>
            </ul>

            <div className="d-flex align-items-center ms-3 d-none d-lg-block">
              <button
                type="button"
                className="btn btn-outline-warning btn-sm fw-bold"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Invocación del Modal Global */}
      <ModalEnDesarrollo 
        show={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
}

export default Navbar;