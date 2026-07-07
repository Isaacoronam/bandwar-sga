import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import EstudianteDashboard from './views/estudiante/EstudianteDashboard';
import MisEvaluaciones from './views/estudiante/MisEvaluaciones';
import MisNotas from './views/estudiante/MisNotas';
import TomarExamen from './views/estudiante/TomarExamen';
import RevisarExamen from './views/estudiante/RevisarExamen';
import OrdenCerrado from './views/estudiante/OrdenCerrado';
import VisorInstrumento from './views/estudiante/VisorInstrumento';
import Multimedia from './views/estudiante/Multimedia';
import Historia from './views/estudiante/Historia';
import Perfil from './views/shared/Perfil';
import ProfesorDashboard from './views/profesor/ProfesorDashboard';
import GestionEvaluaciones from './views/profesor/GestionEvaluaciones';
import CrearEditarExamen from './views/profesor/CrearEditarExamen';
import GestionarPreguntas from './views/profesor/GestionarPreguntas';
import HistoriaBanda from './views/HistoriaBanda';
import Login from './views/auth/Login';
import './App.css';

const getDashboardPath = (rol) => {
  if (rol === 'PROFESOR') return '/profesor-dashboard';
  if (rol === 'ESTUDIANTE') return '/dashboard';
  return '/login';
};

/**
 * Componente ProtectedRoute - Protege rutas según autenticación
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Componente StudentOnlyRoute - Protege rutas solo para estudiantes
 */
function StudentOnlyRoute({ children }) {
  const { isAuthenticated, getRol, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (getRol() !== 'ESTUDIANTE') {
    return <Navigate to={getDashboardPath(getRol())} replace />;
  }

  return children;
}

function ProfessorOnlyRoute({ children }) {
  const { isAuthenticated, getRol, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (getRol() !== 'PROFESOR') {
    return <Navigate to={getDashboardPath(getRol())} replace />;
  }

  return children;
}

/**
 * Componente RoleBasedRoute - Renderiza diferente componente según rol
 */
/**
 * Componente AppRoutes - Define todas las rutas de la aplicación
 */
function AppRoutes() {
  const { isAuthenticated, getRol } = useAuth();

  return (
    <Routes>
      {/* Ruta de Login - Accesible sin autenticación */}
      <Route path="/login" element={<Login />} />

      {/* Ruta raíz - Redirige a login o dashboard */}
      <Route
        path="/"
        element={isAuthenticated() ? <Navigate to={getDashboardPath(getRol())} replace /> : <Navigate to="/login" replace />}
      />

      {/* Rutas protegidas */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard de estudiante */}
        <Route
          path="/dashboard"
          element={
            <StudentOnlyRoute>
              <EstudianteDashboard />
            </StudentOnlyRoute>
          }
        />

        {/* Rutas de Estudiante */}
        <Route path="/estudiante/orden-cerrado" element={<StudentOnlyRoute><OrdenCerrado /></StudentOnlyRoute>} />
        <Route
          path="/estudiante/visor"
          element={
            <StudentOnlyRoute>
              <VisorInstrumento />
            </StudentOnlyRoute>
          }
        />
        <Route
          path="/estudiante/visor-3d"
          element={
            <StudentOnlyRoute>
              <VisorInstrumento />
            </StudentOnlyRoute>
          }
        />
        <Route
          path="/estudiante/evaluaciones"
          element={
            <StudentOnlyRoute>
              <MisEvaluaciones />
            </StudentOnlyRoute>
          }
        />
        <Route
          path="/estudiante/notas"
          element={
            <StudentOnlyRoute>
              <MisNotas />
            </StudentOnlyRoute>
          }
        />
        <Route
          path="/estudiante/evaluaciones/:id/tomar"
          element={
            <StudentOnlyRoute>
              <TomarExamen />
            </StudentOnlyRoute>
          }
        />
        <Route
          path="/estudiante/evaluaciones/:id/revisar"
          element={
            <StudentOnlyRoute>
              <RevisarExamen />
            </StudentOnlyRoute>
          }
        />
        <Route path="/multimedia" element={<Multimedia />} />
        <Route path="/historia" element={<Historia />} />
        <Route path="/historia-banda" element={<HistoriaBanda />} />
        <Route path="/perfil" element={<Perfil />} />

        {/* Rutas de Profesor */}
        <Route
          path="/profesor-dashboard"
          element={
            <ProfessorOnlyRoute>
              <ProfesorDashboard />
            </ProfessorOnlyRoute>
          }
        />
        <Route
          path="/profesor/perfil"
          element={
            <ProfessorOnlyRoute>
              <Perfil />
            </ProfessorOnlyRoute>
          }
        />
        <Route
          path="/profesor/evaluaciones"
          element={
            <ProfessorOnlyRoute>
              <GestionEvaluaciones />
            </ProfessorOnlyRoute>
          }
        />
        <Route
          path="/profesor/evaluaciones/nuevo"
          element={
            <ProfessorOnlyRoute>
              <CrearEditarExamen />
            </ProfessorOnlyRoute>
          }
        />
        <Route
          path="/profesor/evaluaciones/:id/editar"
          element={
            <ProfessorOnlyRoute>
              <CrearEditarExamen />
            </ProfessorOnlyRoute>
          }
        />
        <Route
          path="/profesor/evaluaciones/:id/preguntas"
          element={
            <ProfessorOnlyRoute>
              <GestionarPreguntas />
            </ProfessorOnlyRoute>
          }
        />

      </Route>

      {/* Ruta 404 - No encontrada */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

/**
 * Componente principal App
 */
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
