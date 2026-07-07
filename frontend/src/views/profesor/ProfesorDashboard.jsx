import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './ProfesorDashboard.css';
import RegistroAlumnoForm from './RegistroAlumnoForm';
import api from '../../api/axiosConfig';

/**
 * ProfesorDashboard - Panel principal para profesores/instructores de la banda de guerra
 * @component
 * @returns {JSX.Element} Dashboard modularizado libre de warnings de ESLint y React 19
 */
function ProfesorDashboard() {
  const { usuario, getRol } = useAuth();
  const navigate = useNavigate();

  // Estados principales de las pestañas dinámicas
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio', 'tropa', 'inventario', 'evaluaciones'
  const [estudiantes, setEstudiantes] = useState([]);
  const [instrumentos, setInstrumentos] = useState([]);
  const [examenes, setExamenes] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [showRegistroModal, setShowRegistroModal] = useState(false);
  const [alumnoParaEditar, setAlumnoParaEditar] = useState(null);
  const [showCrearExamenModal, setShowCrearExamenModal] = useState(false);
  const [showRegistrarInstrumento, setShowRegistrarInstrumento] = useState(false);
  const [nuevoInstrumento, setNuevoInstrumento] = useState({ nombre: '' });
  const [registrandoInstrumento, setRegistrandoInstrumento] = useState(false);
  const [showNotasExamenModal, setShowNotasExamenModal] = useState(false);
  const [notasExamen, setNotasExamen] = useState([]);
  const [notasExamenLoading, setNotasExamenLoading] = useState(false);
  const [notasExamenError, setNotasExamenError] = useState('');
  const [examenSeleccionadoParaNotas, setExamenSeleccionadoParaNotas] = useState(null);

  // Estados para asignación cruzada y formularios
  const [selectedEstudiante, setSelectedEstudiante] = useState(null);
  const [selectedInstrumento, setSelectedInstrumento] = useState(null);
  const [showMantenimientoModal, setShowMantenimientoModal] = useState(false);
  const [instrumentoMantenimiento, setInstrumentoMantenimiento] = useState(null);
  const [motivoMantenimiento, setMotivoMantenimiento] = useState('');
  const [showAuditoriaModal, setShowAuditoriaModal] = useState(false);
  const [auditoriaInstrumentos, setAuditoriaInstrumentos] = useState([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);
  const [cargandoInstrumentos, setCargandoInstrumentos] = useState(false);
  const [finalizandoMantenimientoId, setFinalizandoMantenimientoId] = useState(null);

  const handleNuevoInstrumentoChange = (e) => {
    const { name, value } = e.target;
    setNuevoInstrumento((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const limpiarNuevoInstrumento = () => {
    setNuevoInstrumento({ nombre: '' });
  };

  const cargarInstrumentos = async () => {
    setCargandoInstrumentos(true);
    try {
      const response = await api.get('/api/instrumentos/');
      setInstrumentos(response.data.results || response.data);
    } catch (err) {
      console.error('[ERROR] cargarInstrumentos:', err);
      showToast('Error al cargar el inventario de instrumentos', 'danger');
    } finally {
      setCargandoInstrumentos(false);
    }
  };

  const handleRegistrarInstrumento = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!nuevoInstrumento.nombre || !nuevoInstrumento.nombre.trim()) {
      setError('Seleccione el instrumento a registrar');
      return;
    }

    setRegistrandoInstrumento(true);
    try {
      const payload = { nombre: nuevoInstrumento.nombre };
      const response = await api.post('/api/instrumentos/', payload);
      const created = response.data || {};
      // Garantizar propiedades esperadas por el UI
      const mapped = {
        id: created.id,
        nombre: created.nombre || nuevoInstrumento.nombre,
        marca: created.marca || 'UNEFA',
        modelo: created.modelo || (created.nombre || nuevoInstrumento.nombre),
        numero_serie: created.numero_serie,
        estado: created.estado || 'Disponible',
        modelo_3d_url: created.modelo_3d_url || created.modelo3d || null,
        fecha_registro: created.fecha_registro,
        activo: created.activo !== undefined ? created.activo : true,
      };

      setInstrumentos((prev) => [mapped, ...prev]);
      showToast('Instrumento registrado correctamente', 'success');
      setShowRegistrarInstrumento(false);
      limpiarNuevoInstrumento();
      setError('');
    } catch (err) {
      console.error('[ERROR] registrar instrumento:', err);
      const message = err.response?.data?.detail || err.response?.data?.error || 'Error al registrar instrumento';
      setError(message);
    } finally {
      setRegistrandoInstrumento(false);
    }
  };

  // SOLUCIÓN [react-hooks/purity]: Inicialización mediante funciones perezosas puras
  const [nuevoExamen, setNuevoExamen] = useState(() => {
    const hoy = new Date();
    const limite = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      titulo: '',
      descripcion: '',
      duracion_minutos: 60,
      fecha_apertura: hoy.toISOString().split('T')[0],
      fecha_cierre: limite.toISOString().split('T')[0],
    };
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Gancho de efecto inicial para validación de permisos de acceso institucional
  useEffect(() => {
    const rol = getRol();
    if (rol === 'ESTUDIANTE') {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!['PROFESOR', 'INSTRUCTOR'].includes(rol)) {
      console.warn('[WARN] Acceso denegado: El rol no cumple con privilegios de instructor o profesor');
      navigate('/login', { replace: true });
      return;
    }

    /**
     * Carga defensiva y asíncrona de colecciones interactuando con la API REST
     * SOLUCIÓN [react-hooks/set-state-in-effect]: Encapsulado dentro del ciclo de vida local
     */
    const loadData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          setError('No autenticado. Por favor inicia sesión nuevamente.');
          setIsLoading(false);
          return;
        }

        // 1. Cargar estudiantes registrados
        try {
          const estudiantesRes = await api.get('/api/profesor/alumnos/');
        setEstudiantes(estudiantesRes.data);
        } catch (err) {
          console.error('[ERROR] Falló la sincronización de la tropa:', err);
        }

        // 2. Cargar inventario técnico de instrumentos
        try {
          await cargarInstrumentos();
        } catch (err) {
          console.error('[ERROR] Falló la sincronización de inventario:', err);
        }

        // 3. Cargar exámenes teóricos parametrizados
        try {
          const examenesRes = await api.get('/api/profesor/examenes/');
        setExamenes(examenesRes.data);
        } catch (err) {
          console.error('[ERROR] Falló el mapeo de evaluaciones:', err);
        }

      } catch (err) {
        console.error('[ERROR] Excepción crítica al consultar ViewSets:', err);
        setError('Error general al sincronizar datos del servidor');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [getRol, navigate]);

  // Función pública para que subcomponentes recarguen la lista de alumnos
  const refreshListaAlumnos = async () => {
    try {
      const res = await api.get('/api/profesor/alumnos/');
      setEstudiantes(res.data);
    } catch (e) {
      console.error('[ERROR] refreshListaAlumnos:', e);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type }), 3500);
  };

  const handleEliminarExamen = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este examen? Esta acción no se puede deshacer.')) return;

    try {
      const response = await api.delete(`/api/profesor/examenes/${id}/`);
      if (response.status === 204) {
        setExamenes((prev) => prev.filter((exam) => exam.id !== id));
        showToast('Examen eliminado correctamente', 'success');
      } else {
        throw new Error('Respuesta inesperada al eliminar examen');
      }
    } catch (err) {
      console.error('[ERROR] handleEliminarExamen:', err);
      setError(err.response?.data?.detail || err.message || 'Error al eliminar el examen');
    }
  };

  const handleVerNotasExamen = async (id) => {
    setNotasExamen([]);
    setNotasExamenError('');
    setNotasExamenLoading(true);
    setShowNotasExamenModal(true);
    const examen = examenes.find((exam) => exam.id === id) || null;
    setExamenSeleccionadoParaNotas(examen);

    try {
      const response = await api.get(`/api/profesor/examenes/${id}/intentos/`);
      setNotasExamen(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('[ERROR] handleVerNotasExamen:', err);
      setNotasExamenError(err.response?.data?.detail || err.message || 'Error al cargar las notas');
    } finally {
      setNotasExamenLoading(false);
    }
  };

  const closeNotasExamenModal = () => {
    setShowNotasExamenModal(false);
    setExamenSeleccionadoParaNotas(null);
    setNotasExamen([]);
    setNotasExamenError('');
    setNotasExamenLoading(false);
  };

  // Wrappers to provide common handler names used in table JSX
  const handleEliminar = (id) => handleEliminarExamen(id);
  const handleVerNotas = (id) => handleVerNotasExamen(id);

  /**
   * Ejecuta la asignación transaccional de un instrumento en stock real a un alumno
   */
  const handleAsignarInstrumento = async () => {
    if (!selectedEstudiante || !selectedInstrumento) {
      setError('Debe seleccionar obligatoriamente un estudiante y un instrumento');
      return;
    }

    try {
      const response = await api.post('/api/profesor/asignar-instrumento/', {
        estudiante_id: selectedEstudiante.id,
        instrumento_id: selectedInstrumento.id,
      });

      if (response.status === 200 || response.status === 201) {
        setError('');
        setShowAsignarModal(false);
        setSelectedEstudiante(null);
        setSelectedInstrumento(null);
        setIsLoading(true);
        await refreshListaAlumnos();
        const instrumentosRes = await api.get('/api/instrumentos/');
        setInstrumentos(instrumentosRes.data.results || instrumentosRes.data);
        setIsLoading(false);
      } else {
        setError('No se cumplen las reglas de negocio para la asignación');
      }
    } catch (err) {
      console.error('[ERROR] Falla en la petición de asignación:', err);
      setError('Error al procesar la asignación de activos');
    }
  };

  const handleEliminarAlumno = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este estudiante? Esta acción no se puede deshacer.')) return;
    try {
      const res = await api.delete(`/api/profesor/eliminar-alumno/${id}/`);
      if (res.status === 204 || res.status === 200) {
        await refreshListaAlumnos();
        showToast('Estudiante eliminado', 'warning');
      } else {
        console.error('handleEliminarAlumno: respuesta inesperada', res);
        showToast('No se pudo eliminar el estudiante', 'danger');
      }
    } catch (err) {
      console.error('[ERROR] handleEliminarAlumno:', err);
      showToast('Error eliminando estudiante', 'danger');
    }
  };

  const handleEliminarInstrumento = async (id) => {
    if (!window.confirm('¿Eliminar instrumento? Esta acción removerá el registro del inventario.')) return;
    try {
      const res = await api.delete(`/api/instrumentos/${id}/`);
      if (res.status === 204 || res.status === 200) {
        setInstrumentos((prev) => prev.filter((i) => i.id !== id));
        showToast('Instrumento eliminado', 'warning');
      } else {
        console.error('handleEliminarInstrumento: respuesta inesperada', res);
        showToast('No se pudo eliminar el instrumento', 'danger');
      }
    } catch (err) {
      console.error('[ERROR] handleEliminarInstrumento:', err);
      showToast('Error al eliminar instrumento', 'danger');
    }
  };

  const handleDesasignarInstrumento = async (instrumentoId) => {
    if (!window.confirm('¿Confirmas desasignar este instrumento y devolverlo al inventario?')) return;
    try {
      const res = await api.post(`/api/instrumentos/${instrumentoId}/desasignar/`, {});
      if (res.status === 200) {
        setInstrumentos((prev) => prev.map((instr) => instr.id === instrumentoId ? res.data.instrumento || { ...instr, estado: 'Disponible', usuario: null } : instr));
        await refreshListaAlumnos();
        showToast(res.data.message || 'Instrumento desasignado correctamente', 'success');
      } else {
        console.error('handleDesasignarInstrumento: respuesta inesperada', res);
        showToast('No se pudo desasignar el instrumento', 'danger');
      }
    } catch (err) {
      console.error('[ERROR] handleDesasignarInstrumento:', err);
      showToast(err.response?.data?.error || 'Error al desasignar instrumento', 'danger');
    }
  };

  const handleOpenMantenimiento = (instr) => {
    setInstrumentoMantenimiento(instr);
    setMotivoMantenimiento('');
    setShowMantenimientoModal(true);
  };

  const handleEnviarMantenimiento = async () => {
    if (!motivoMantenimiento.trim()) {
      showToast('El motivo técnico es obligatorio', 'danger');
      return;
    }
    if (!instrumentoMantenimiento) {
      showToast('Selecciona un instrumento válido', 'danger');
      return;
    }

    try {
      const res = await api.post(
        `/api/instrumentos/${instrumentoMantenimiento.id}/mantenimiento/`,
        { motivo_tecnico: motivoMantenimiento.trim() },
      );

      if (res.status === 200) {
        await cargarInstrumentos();
        await refreshListaAlumnos();
        setShowMantenimientoModal(false);
        setInstrumentoMantenimiento(null);
        setMotivoMantenimiento('');
        showToast(res.data.message || 'Instrumento enviado a mantenimiento', 'success');
      } else {
        console.error('handleEnviarMantenimiento: respuesta inesperada', res);
        showToast('No se pudo enviar el instrumento a mantenimiento', 'danger');
      }
    } catch (err) {
      console.error('[ERROR] handleEnviarMantenimiento:', err);
      showToast(err.response?.data?.error || 'Error al reportar mantenimiento', 'danger');
    }
  };

  const fetchAuditoria = async () => {
    setCargandoAuditoria(true);
    try {
      const res = await api.get('/api/instrumentos/auditoria/');
      setAuditoriaInstrumentos(res.data);
    } catch (err) {
      console.error('Error al cargar auditoría:', err);
      showToast('Error al cargar auditoría de mantenimiento', 'danger');
      setAuditoriaInstrumentos([]);
    } finally {
      setCargandoAuditoria(false);
    }
  };

  const handleFinalizarMantenimiento = async (id) => {
    if (finalizandoMantenimientoId) return;
    setFinalizandoMantenimientoId(id);

    try {
      const res = await api.post(`/api/instrumentos/${id}/finalizar-mantenimiento/`);
      if (res.status === 200) {
        setToast({ visible: true, message: res.data.message || 'Mantenimiento finalizado', type: 'success' });
        await cargarInstrumentos();
        await fetchAuditoria();
      } else {
        showToast(res.data?.error || 'No se pudo finalizar mantenimiento', 'danger');
      }
    } catch (err) {
      console.error('Error al finalizar mantenimiento:', err);
      showToast(err.response?.data?.error || 'Error al finalizar mantenimiento', 'danger');
    } finally {
      setFinalizandoMantenimientoId(null);
    }
  };

  const handleDesasignarAlumno = async (instrumentoId) => {
    if (!window.confirm('¿Confirmas desasignar el instrumento asignado al estudiante?')) return;
    try {
      const res = await api.post(`/api/instrumentos/${instrumentoId}/desasignar/`, {});
      if (res.status === 200) {
        await refreshListaAlumnos();
        setInstrumentos((prev) => prev.map((instr) => instr.id === instrumentoId ? res.data.instrumento || { ...instr, estado: 'Disponible' } : instr));
        showToast(res.data.message || 'Instrumento desasignado', 'success');
      } else {
        console.error('handleDesasignarAlumno: respuesta inesperada', res);
        showToast('No se pudo desasignar el instrumento', 'danger');
      }
    } catch (err) {
      console.error('[ERROR] handleDesasignarAlumno:', err);
      showToast(err.response?.data?.error || 'Error al desasignar instrumento', 'danger');
    }
  };

  /**
   * Persiste la configuración del examen teórico en la base de datos
   */
  const handleCrearExamen = async () => {
    if (!nuevoExamen.titulo.trim()) {
      setError('El título de la evaluación es requerido por la rúbrica');
      return;
    }

    if (!nuevoExamen.fecha_apertura || !nuevoExamen.fecha_cierre) {
      setError('Debes especificar fecha de apertura y fecha de cierre.');
      return;
    }

    const apertura = new Date(`${nuevoExamen.fecha_apertura}T00:00:00Z`);
    const cierre = new Date(`${nuevoExamen.fecha_cierre}T23:59:59Z`);
    if (cierre <= apertura) {
      setError('La fecha de cierre debe ser posterior a la fecha de apertura.');
      return;
    }

    try {
      const response = await api.post('/api/profesor/examenes/', {
        ...nuevoExamen,
        fecha_apertura: apertura.toISOString(),
        fecha_cierre: cierre.toISOString(),
        intentos_permitidos: 1,
      });

      setError('');
      setShowCrearExamenModal(false);
      setNuevoExamen(() => {
        const hoy = new Date();
        const limite = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
        return {
          titulo: '',
          descripcion: '',
          duracion_minutos: 60,
          fecha_apertura: hoy.toISOString().split('T')[0],
          fecha_cierre: limite.toISOString().split('T')[0],
        };
      });
      setIsLoading(true);
      try {
        const examenesRes = await api.get('/api/profesor/examenes/');
        setExamenes(examenesRes.data);
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    } catch (err) {
      console.error('[ERROR] Excepción al registrar evaluación:', err);
      const message = err.response?.data?.detail || err.response?.data?.error || 'Error al crear la evaluación teórica';
      setError(message);
    }
  };

  if (isLoading) {
    return (
      <div className="container mt-5 text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Sincronizando con Bandwar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Cabecera idéntica al prototipo HTML/Django */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0 text-dark">BANDWAR - PANEL DE CONTROL</h2>
          <p className="text-muted">Gestión de la Banda de Guerra UNEFA | Sede Coro</p>
        </div>
        <div className="text-end">
          <span className="badge bg-dark p-2 px-3">
            <i className="bi bi-shield-check me-2 text-warning"></i>
            Rol: {usuario?.rango_militar || 'Instructor'}
          </span>
        </div>
      </div>

      {/* Alertas globales de negocio */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Cerrar"></button>
        </div>
      )}

      {/* Tabs adaptados limpios de Bootstrap Icons */}
      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'inicio' ? 'active fw-bold' : ''}`} 
            onClick={() => setActiveTab('inicio')}
            type="button"
          >
            <i className="bi bi-house-door me-2"></i>Inicio
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'tropa' ? 'active fw-bold' : ''}`} 
            onClick={() => setActiveTab('tropa')}
            type="button"
          >
            <i className="bi bi-people me-2"></i>Gestión de Tropa
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'inventario' ? 'active fw-bold' : ''}`} 
            onClick={() => setActiveTab('inventario')}
            type="button"
          >
            <i className="bi bi-instrument-music me-2"></i>Inventario de Instrumentos
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'evaluaciones' ? 'active fw-bold' : ''}`} 
            onClick={() => setActiveTab('evaluaciones')}
            type="button"
          >
            <i className="bi bi-journal-text me-2"></i>Panel de Evaluaciones
          </button>
        </li>
      </ul>

      {/* TAB 1: SECCIÓN INICIO - VISTA ORIGINAL DJANGO */}
      {activeTab === 'inicio' && (
        <>
          <div className="row g-4 mb-4">
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm overflow-hidden">
                <div className="card-header bg-primary text-white py-3">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-journal-check me-2"></i>Módulo de Exámenes
                  </h5>
                </div>
                <div className="card-body d-flex flex-column gap-2 bg-white">
                  <button 
                    onClick={() => { setActiveTab('evaluaciones'); setShowCrearExamenModal(true); }} 
                    className="btn btn-primary py-3 fw-bold shadow-sm"
                  >
                    <i className="bi bi-plus-circle me-2"></i>Gestionar Exámenes
                  </button>
                  <button onClick={() => setActiveTab('evaluaciones')} className="btn btn-outline-primary py-3">
                    <i className="bi bi-eye me-2"></i>Ver Lista Completa
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm bg-info text-white h-100">
                <div className="card-body text-center py-4">
                  <i className="bi bi-music-note-beamed display-4 mb-2"></i>
                  <h2 className="fw-bold mb-0">0</h2>
                  <p className="card-text opacity-75">
                    Materiales en Biblioteca <span className="badge bg-warning text-dark ms-2 small">Próximamente</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm bg-dark text-white h-100">
                <div className="card-body text-center py-4">
                  <i className="bi bi-hdd-network display-4 mb-2 text-warning"></i>
                  <h2 className="fw-bold mb-0 text-warning">Activo</h2>
                  <p className="card-text opacity-75">Sincronización con "Bandwar"</p>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-8">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0 fw-bold"><i className="bi bi-gear-wide-connected me-2"></i>Acciones Administrativas</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <button onClick={() => setActiveTab('tropa')} className="btn btn-outline-primary w-100 py-3">
                        <i className="bi bi-person-plus-fill fs-3 d-block mb-2"></i>
                        Registrar / Controlar Alumnos
                      </button>
                    </div>
                    <div className="col-6">
                      <button 
                        onClick={() => setError('Módulo de carga multimedia en desarrollo')} 
                        className="btn btn-outline-success w-100 py-3"
                      >
                        <i className="bi bi-cloud-arrow-up-fill fs-3 d-block mb-2"></i>
                        Cargar archivo
                        <span className="badge bg-warning text-dark ms-2 small">Próximamente</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white py-3">
                  <h6 className="mb-0 fw-bold">Evaluaciones Recientes del Servidor</h6>
                </div>
                <div className="list-group list-group-flush">
                  {examenes.slice(0, 3).map((exam) => (
                    <div key={exam.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span><i className="bi bi-file-earmark-play me-2"></i>{exam.titulo}</span>
                      <span className="badge bg-light text-dark small">Vence: {exam.fecha_cierre?.split('T')[0]}</span>
                    </div>
                  ))}
                  {examenes.length === 0 && (
                    <div className="list-group-item text-center py-4 text-muted">
                      Aún no has estructurado exámenes en la academia.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body text-center">
                  <i className="bi bi-person-badge display-1 text-primary"></i>
                  <h5 className="fw-bold mt-3">{usuario?.nombre} {usuario?.apellido}</h5>
                  <p className="text-muted small">{usuario?.rango_militar || 'Instructor de Orden Cerrado'}</p>
                  <button 
                    onClick={() => navigate('/perfil')} 
                    className="btn btn-light btn-sm w-100"
                  >
                    <i className="bi bi-pencil"></i> Editar Perfil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: GESTIÓN DE TROPA */}
      {activeTab === 'tropa' && (
        <div className="card border-0 shadow-sm p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold mb-0 text-dark">Gestión de Alumnos de la Tropa</h4>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary" onClick={() => setShowRegistroModal(true)}>
                    <i className="bi bi-person-plus-fill me-2"></i>Registrar Alumno
                  </button>
                  <button className="btn btn-success" onClick={() => setShowAsignarModal(true)}>
                    <i className="bi bi-plus-circle me-2"></i>Asignar Instrumento Real
                  </button>
                </div>
          </div>

          {estudiantes.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped table-hover align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Cédula</th>
                    <th>Nombre Completo</th>
                    <th>Email</th>
                    <th>Instrumento Asignado Vigente</th>
                    <th>Estado Militar</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map((est) => (
                    <tr key={est.id}>
                      <td><strong>{est.cedula}</strong></td>
                      <td>{est.nombre_completo}</td>
                      <td>{est.email}</td>
                      <td>
                        {est.instrumento_asignado ? (
                          <span className="badge bg-info p-2 text-dark">
                            <i className="bi bi-tag-fill me-1"></i>
                            {est.instrumento_asignado.nombre || est.instrumento_asignado}
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark">Sin asignar</span>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-success">Activo</span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2" aria-label="Acciones alumno">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary text-white shadow-sm px-3"
                            onClick={() => { setAlumnoParaEditar(est); setShowRegistroModal(true); }}
                            title="Editar alumno"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger text-white shadow-sm px-3"
                            onClick={() => handleEliminarAlumno(est.id)}
                            title="Eliminar alumno"
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info text-center py-4">
              <i className="bi bi-info-circle me-2"></i>No hay alumnos registrados.
            </div>
          )}
        </div>
      )}

      {/* Toast de éxito/alertas breves */}
      {toast.show && (
        <div className={`toast d-block position-fixed top-0 end-0 m-3 bg-${toast.type === 'success' ? 'success' : 'danger'} text-white`} role="alert">
          <div className="toast-body">{toast.message}</div>
        </div>
      )}

      {/* MODAL: Registro de Alumno */}
      {showRegistroModal && (
        <RegistroAlumnoForm
          key={alumnoParaEditar ? alumnoParaEditar.id : 'nuevo-alumno'} // <--- ESTA LÍNEA es la que limpia los estados y evita el error de ESLint
          show={showRegistroModal}
          onClose={() => {
            setShowRegistroModal(false);
            setAlumnoParaEditar(null); // Limpiamos el estado de edición al cerrar
          }}
          refreshListaAlumnos={refreshListaAlumnos}
          onSuccessToast={(msg) => showToast(msg, 'success')}
          estudiantes={estudiantes}
          alumnoParaEditar={alumnoParaEditar} // Se lo pasamos como prop para que sepa si edita o crea
        />
      )}

      {/* TAB 3: INVENTARIO DE INSTRUMENTOS */}
      {activeTab === 'inventario' && (
        <div className="card border-0 shadow-sm p-4">
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <h4 className="fw-bold mb-0 text-dark">Inventario de Instrumentos Físicos de la Banda</h4>
              <p className="text-muted small mb-0">Registra y mantén actualizado el stock real de instrumentos disponibles.</p>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={() => { setShowAuditoriaModal(true); fetchAuditoria(); }}>
                <i className="bi bi-journal-text me-2"></i>Auditoría de Mantenimiento
              </button>
              <button className="btn btn-primary" onClick={() => setShowRegistrarInstrumento(true)}>
                <i className="bi bi-plus-circle me-2"></i>Registrar Instrumento
              </button>
            </div>
          </div>
          {instrumentos.length > 0 ? (
            <div className="row g-3">
              {instrumentos.map((instr) => (
                <div className="col-md-6 col-lg-4" key={instr.id}>
                  <div className="card shadow-sm h-100 border-start border-4 border-primary">
                    <div className="card-body">
                      <div className="d-flex align-items-start">
                        <h5 className="card-title text-primary fw-bold mb-0">{instr.nombre}</h5>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger ms-auto"
                          onClick={() => handleEliminarInstrumento(instr.id)}
                          aria-label={`Eliminar ${instr.nombre}`}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                      <p className="card-text small mb-3">
                        <strong>Marca:</strong> {instr.marca}<br />
                        <strong>Modelo:</strong> {instr.modelo}<br />
                        <strong>Nro de Serie:</strong> <code className="text-dark">{instr.numero_serie || 'S/N (Sin Serial)'}</code>
                      </p>
                      <div>
                        {instr.estado === 'Disponible' && (
                          <span className="badge bg-success"><i className="bi bi-check-circle me-1"></i>Disponible para Tropa</span>
                        )}
                        {instr.estado === 'Asignado' && (
                          <span className="badge bg-info text-dark"><i className="bi bi-person-check me-1"></i>Asignado</span>
                        )}
                        {(instr.estado === 'En Mantenimiento' || instr.estado === 'En Taller') && (
                          <span className="badge bg-warning text-dark"><i className="bi bi-wrench me-1"></i>En Taller / Mantenimiento</span>
                        )}
                        {(instr.estado === 'Dañado' || instr.estado === 'Extraviado') && (
                          <span className="badge bg-danger text-white"><i className="bi bi-exclamation-triangle-fill me-1"></i>{instr.estado}</span>
                        )}
                      </div>

                      <div className="d-flex gap-2 mt-3 flex-wrap">
                        {['En Taller', 'En Mantenimiento'].includes(instr.estado) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleFinalizarMantenimiento(instr.id)}
                            disabled={finalizandoMantenimientoId === instr.id}
                          >
                            <i className="bi bi-check-circle me-1"></i>
                            {finalizandoMantenimientoId === instr.id ? 'Finalizando...' : 'Finalizar Mantenimiento'}
                          </button>
                        )}

                        {['En Taller', 'En Mantenimiento', 'Dañado', 'Extraviado'].includes(instr.estado) ? null : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleOpenMantenimiento(instr)}
                          >
                            <i className="bi bi-wrench me-1"></i>Mantenimiento
                          </button>
                        )}

                        {instr.estado === 'Asignado' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleDesasignarInstrumento(instr.id)}
                          >
                            <i className="bi bi-person-x me-1"></i>Desasignar
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleEliminarInstrumento(instr.id)}
                        >
                          <i className="bi bi-trash me-1"></i>Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-info text-center py-4">
              <i className="bi bi-info-circle me-2"></i>No hay registros de instrumentos físicos en el almacén digital.
            </div>
          )}
        </div>
      )}

      {showRegistrarInstrumento && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-plus-circle me-2"></i>Registrar Instrumento</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRegistrarInstrumento(false)}></button>
              </div>
              <form onSubmit={handleRegistrarInstrumento}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-bold">Instrumento *</label>
                      <select
                        className="form-select"
                        name="nombre"
                        value={nuevoInstrumento.nombre}
                        onChange={handleNuevoInstrumentoChange}
                        required
                      >
                        <option value="">-- Seleccione --</option>
                        <option value="Bombo">Bombo</option>
                        <option value="Platillos">Platillos</option>
                        <option value="Lira">Lira</option>
                        <option value="Redoblante">Redoblante</option>
                        <option value="Granaderos">Granaderos</option>
                        <option value="Tambor Mayor">Tambor Mayor</option>
                        <option value="Trompeta">Trompeta</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRegistrarInstrumento(false)} disabled={registrandoInstrumento}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={registrandoInstrumento}>
                    {registrandoInstrumento ? 'Registrando...' : 'Registrar Instrumento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showMantenimientoModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="bi bi-wrench me-2"></i>Reportar Mantenimiento
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowMantenimientoModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Instrumento: <strong>{instrumentoMantenimiento?.nombre}</strong>
                </p>
                <div className="mb-3">
                  <label className="form-label fw-bold">Motivo técnico *</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    maxLength={150}
                    style={{ resize: 'none', height: '100px' }}
                    value={motivoMantenimiento}
                    onChange={(e) => setMotivoMantenimiento(e.target.value)}
                    placeholder="Describe el motivo técnico para el mantenimiento"
                  />
                  <div className="form-text text-end">{motivoMantenimiento.length}/150</div>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMantenimientoModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-warning" onClick={handleEnviarMantenimiento}>
                  <i className="bi bi-send me-1"></i>Enviar a Mantenimiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAuditoriaModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-secondary text-white">
                <h5 className="modal-title"><i className="bi bi-journal-text me-2"></i>Auditoría de Mantenimiento</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAuditoriaModal(false)}></button>
              </div>
              <div className="modal-body">
                {cargandoAuditoria ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-secondary" role="status">
                      <span className="visually-hidden">Cargando auditoría...</span>
                    </div>
                  </div>
                ) : auditoriaInstrumentos.length === 0 ? (
                  <div className="alert alert-info text-center">
                    <i className="bi bi-info-circle me-2"></i>No hay registros de mantenimiento para auditar.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Instrumento</th>
                          <th>Serial</th>
                          <th>Motivo Técnico</th>
                          <th>Último Alumno</th>
                          <th>Responsable</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditoriaInstrumentos.map((item) => (
                          <tr key={item.id}>
                            <td>{item.nombre}</td>
                            <td><code>{item.numero_serie || 'S/N'}</code></td>
                            <td className="text-wrap text-break" style={{ maxWidth: '250px', minWidth: '150px' }}>{item.motivo_tecnico}</td>
                            <td>{item.ultimo_alumno_asignado_nombre || 'N/A'}</td>
                            <td>{item.ultimo_responsable_nombre || 'N/A'}</td>
                            <td>{item.estado}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAuditoriaModal(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PANEL DE EVALUACIONES */}
      {activeTab === 'evaluaciones' && (
        <div className="card border-0 shadow-sm p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold mb-0 text-dark">Panel de Evaluaciones Teóricas</h4>
            <button className="btn btn-primary" onClick={() => setShowCrearExamenModal(true)}>
              <i className="bi bi-file-earmark-plus me-2"></i>Crear Nuevo Examen Teórico
            </button>
          </div>

          {examenes.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Título de Evaluación</th>
                    <th>Descripción / Temario</th>
                    <th>Duración Autorizada</th>
                    <th>Intentos</th>
                    <th>Estado de API</th>
                    <th className="text-center" style={{ width: '250px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {examenes.map((exam) => (
                    <tr key={exam.id}>
                      <td><strong>{exam.titulo}</strong></td>
                      <td className="text-muted text-truncate" style={{ maxWidth: '200px' }}>{exam.descripcion ? exam.descripcion.substring(0, 60) : 'Sin descripción'}</td>
                      <td><i className="bi bi-clock me-1"></i>{exam.duracion_minutos} min</td>
                      <td><span className="badge bg-secondary">{exam.intentos_permitidos || 1} intento(s)</span></td>
                      <td>
                        <span className="badge bg-success">Activo en DRF</span>
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm" role="group">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => navigate(`/profesor/evaluaciones/${exam.id}/preguntas`)}
                            title="Gestionar Preguntas"
                          >
                            <i className="bi bi-question-circle"></i> Preguntas
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-info"
                            onClick={() => handleVerNotas(exam.id)}
                            title="Ver Calificaciones"
                          >
                            <i className="bi bi-journal-text"></i> Notas
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleEliminar(exam.id)}
                            title="Eliminar Examen"
                          >
                            <i className="bi bi-trash"></i> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info text-center py-4">
              <i className="bi bi-info-circle me-2"></i>No se registran evaluaciones activas en la base de datos relacional.
            </div>
          )}
        </div>
      )}

      {showNotasExamenModal && (
        <div className="modal fade show d-block" role="dialog" aria-modal="true">
          <div className="modal-backdrop fade show"></div>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">Notas de {examenSeleccionadoParaNotas?.titulo || examenSeleccionadoParaNotas?.nombre}</h5>
                  <p className="mb-0 text-muted">Consulta los intentos y la calificación final sobre 20.</p>
                </div>
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={closeNotasExamenModal}></button>
              </div>
              <div className="modal-body">
                {notasExamenLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Cargando notas...</span>
                    </div>
                  </div>
                ) : notasExamenError ? (
                  <div className="alert alert-danger">{notasExamenError}</div>
                ) : notasExamen.length === 0 ? (
                  <div className="alert alert-secondary">No hay intentos registrados para este examen.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-bordered align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Estudiante</th>
                          <th>Fecha de envío</th>
                          <th>Duración</th>
                          <th className="text-end">Calificación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notasExamen.map((item) => (
                          <tr key={item.id || `${item.estudiante?.id}-${item.fecha_envio}`}>
                            <td>{item.estudiante?.nombre_completo || item.estudiante?.email || 'Desconocido'}</td>
                            <td>{new Intl.DateTimeFormat('es-VE', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(item.fecha_envio))}</td>
                            <td>{item.duracion_utilizada ? `${item.duracion_utilizada} min` : '-'}</td>
                            <td className="text-end fw-semibold">
                              {typeof item.nota_obtenida === 'number'
                                ? item.nota_obtenida.toFixed(2)
                                : typeof item.calificacion_final === 'number'
                                ? item.calificacion_final.toFixed(2)
                                : item.nota_obtenida ?? item.calificacion_final ?? '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeNotasExamenModal}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAsignarModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold"><i className="bi bi-person-plus me-2"></i>Asignar Instrumento Real</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAsignarModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="estudianteSelect" className="form-label fw-bold">Seleccionar Alumno de la Tropa:</label>
                  <select
                    id="estudianteSelect"
                    className="form-select"
                    onChange={(e) => {
                      const id = parseInt(e.target.value, 10);
                      setSelectedEstudiante(estudiantes.find((est) => est.id === id));
                    }}
                  >
                    <option value="">-- Seleccionar de la Lista --</option>
                    {estudiantes.map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.nombre_completo} (C.I: {est.cedula})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="instrumentoSelect" className="form-label fw-bold">Seleccionar Instrumento (Stock Real):</label>
                  <select
                    id="instrumentoSelect"
                    className="form-select"
                    onChange={(e) => {
                      const id = parseInt(e.target.value, 10);
                      setSelectedInstrumento(instrumentos.find((i) => i.id === id));
                    }}
                  >
                    <option value="">-- Seleccionar del Inventario --</option>
                    {instrumentos
                      .filter((i) => i.estado === 'Disponible')
                      .map((instr) => (
                        <option key={instr.id} value={instr.id}>
                          {instr.nombre} - Serial: {instr.numero_serie}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAsignarModal(false)}>Cancelar</button>
                <button type="button" className="btn btn-success" onClick={handleAsignarInstrumento}>Confirmar Asignación Real</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Crear Examen */}
      {showCrearExamenModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold"><i className="bi bi-file-earmark-medical me-2 text-primary"></i>Diseño de Evaluación Teórica</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCrearExamenModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="titulo" className="form-label fw-bold">Título del Examen:</label>
                  <input
                    id="titulo"
                    type="text"
                    className="form-control"
                    placeholder="Ej: Teoría de Toques de Corneta e Instrumentos"
                    value={nuevoExamen.titulo}
                    onChange={(e) => setNuevoExamen({ ...nuevoExamen, titulo: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="descripcion" className="form-label fw-bold">Descripción o Temario:</label>
                  <textarea
                    id="descripcion"
                    className="form-control"
                    placeholder="Contenidos evaluados en este hito de la academia"
                    rows="3"
                    value={nuevoExamen.descripcion}
                    onChange={(e) => setNuevoExamen({ ...nuevoExamen, descripcion: e.target.value })}
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="duracion" className="form-label fw-bold">Duración</label>
                    <select
                      id="duracion"
                      className="form-select"
                      value={nuevoExamen.duracion_minutos}
                      onChange={(e) => setNuevoExamen({ ...nuevoExamen, duracion_minutos: parseInt(e.target.value, 10) })}
                    >
                      <option value={30}>30 minutos</option>
                      <option value={60}>1 hora</option>
                      <option value={105}>1 hora y 45 minutos</option>
                    </select>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="fechaApertura" className="form-label fw-bold">Fecha de Apertura:</label>
                    <input
                      id="fechaApertura"
                      type="date"
                      className="form-control"
                      value={nuevoExamen.fecha_apertura}
                      onChange={(e) => setNuevoExamen({ ...nuevoExamen, fecha_apertura: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="fechaCierre" className="form-label fw-bold">Fecha de Cierre:</label>
                    <input
                      id="fechaCierre"
                      type="date"
                      className="form-control"
                      value={nuevoExamen.fecha_cierre}
                      onChange={(e) => setNuevoExamen({ ...nuevoExamen, fecha_cierre: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCrearExamenModal(false)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleCrearExamen}>Persistir e Implementar Examen</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfesorDashboard;