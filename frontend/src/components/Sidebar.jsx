import { Link, useLocation } from 'react-router-dom';
import '../styles/sidebar.css';

function Sidebar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path || location.pathname === path + '/';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h5 className="sidebar-brand">Bandwar LMS</h5>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav flex-column">
          <li className="nav-item">
            <Link
              to="/dashboard"
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
            >
              <i className="bi bi-house-door me-2"></i>
              Dashboard
            </Link>
          </li>

          <li className="nav-item">
            <Link
              to="/visor-3d"
              className={`nav-link ${isActive('/visor-3d') ? 'active' : ''}`}
            >
              <i className="bi bi-cube me-2"></i>
              Visor Instrumental 3D
            </Link>
          </li>

          <li className="nav-item">
            <Link
              to="/multimedia"
              className={`nav-link ${isActive('/multimedia') ? 'active' : ''}`}
            >
              <i className="bi bi-collection-play me-2"></i>
              Biblioteca Multimedia
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <small className="text-muted d-block">© 2024 Bandwar</small>
      </div>
    </aside>
  );
}

export default Sidebar;
