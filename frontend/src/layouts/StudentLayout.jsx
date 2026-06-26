import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../styles/layouts.css';

function StudentLayout() {
  return (
    <div className="d-flex layout-container">
      <Sidebar />
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}

export default StudentLayout;
