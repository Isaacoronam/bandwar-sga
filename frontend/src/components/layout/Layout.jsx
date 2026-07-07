import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

function Layout() {
  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <Navbar />

      <main className="container-xxl py-4 flex-grow-1">
        <Outlet />
      </main>

      <footer className="bg-dark text-white text-center py-3 mt-auto">
        © 2026 BANDWAR. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default Layout;
