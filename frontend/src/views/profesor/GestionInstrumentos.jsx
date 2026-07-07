import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/Toast';
import '../../styles/gestion-instrumentos.css';

/**
 * Componente para gestión CRUD de Instrumentos
 * Permite a profesores/instructores crear, editar, eliminar y asignar instrumentos a estudiantes
 */
function GestionInstrumentos() {
  const { getRol } = useAuth();
  const rolActual = getRol();
  const esAutorizado = rolActual && ['PROFESOR', 'INSTRUCTOR'].includes(rolActual.toUpperCase());
  const [toast, setToast] = useState(() => {
    if (!esAutorizado) {
      return {
        visible: true,
        message: `Acceso denegado: tu rol actual (${rolActual || 'Ninguno'}) no tiene permisos.`,
        type: 'error',
      };
    }
    return { visible: false, message: '', type: 'info' };
  });

  // Estados de lista
  const [instrumentos, setInstrumentos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Estados de formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Viento',
    marca: '',
    modelo: '',
    numero_serie: '',
    estado: 'Disponible',
    descripcion: '',
  });

  // Estados de asignación
  const [mostrarAsignacion, setMostrarAsignacion] = useState(false);
  const [instrumentoAAsignar, setInstrumentoAAsignar] = useState(null);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState('');
  const [mostrarModalMantenimiento, setMostrarModalMantenimiento] = useState(false);
  const [instrumentoMantenimiento, setInstrumentoMantenimiento] = useState(null);
  const [motivoMantenimiento, setMotivoMantenimiento] = useState('');

  // Verificar rol
  const cargarInstrumentos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);
      if (filtroTipo) params.append('tipo', filtroTipo);

      const response = await api.get('/api/instrumentos/', { params });
      setInstrumentos(response.data);
    } catch (error) {
      console.error('Error al cargar instrumentos:', error);
      setToast({ visible: true, message: 'Error al cargar instrumentos', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroTipo]);

  const cargarEstudiantes = useCallback(async () => {
    try {
      const response = await api.get('/api/profesor/alumnos/');
      setEstudiantes(response.data);
    } catch (error) {
      console.error('Error al cargar estudiantes:', error);
    }
  }, []);

  useEffect(() => {
    if (!esAutorizado) return;
    const timerId = window.setTimeout(() => {
      void cargarInstrumentos();
      void cargarEstudiantes();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [esAutorizado, cargarInstrumentos, cargarEstudiantes]);

  /**
   * Manejar cambios en formulario
   */

  /**
   * Manejar cambios en formulario
   */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Limpiar formulario
   */
  const limpiarFormulario = () => {
    setFormData({
      nombre: '',
      tipo: 'Viento',
      marca: '',
      modelo: '',
      numero_serie: '',
      estado: 'Disponible',
      descripcion: '',
    });
    setEditando(null);
    setMostrarFormulario(false);
  };

  /**
   * Guardar instrumento (crear o actualizar)
   */
  const handleGuardar = async (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.nombre.trim() || !formData.numero_serie.trim()) {
      setToast({ visible: true, message: 'Nombre y número de serie son obligatorios', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        tipo: formData.tipo,
        marca: formData.marca.trim(),
        numero_serie: formData.numero_serie.toUpperCase().trim(),
        estado: formData.estado,
      };

      if (editando) {
        // Actualizar
        await api.put(`/api/instrumentos/${editando}/`, payload);
        setToast({ visible: true, message: 'Instrumento actualizado correctamente', type: 'success' });
      } else {
        // Crear
        await api.post('/api/instrumentos/', payload);
        setToast({ visible: true, message: 'Instrumento creado correctamente', type: 'success' });
      }

      limpiarFormulario();
      cargarInstrumentos();
    } catch (error) {
      console.error('Error al guardar instrumento:', error);
      const mensaje = error.response?.data?.numero_serie?.[0] || 
                      error.response?.data?.detail ||
                      'Error al guardar instrumento';
      setToast({ visible: true, message: mensaje, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cargar instrumento para editar
   */
  const handleEditar = (instrumento) => {
    setFormData({
      nombre: instrumento.nombre || '',
      tipo: instrumento.tipo || 'Viento',
      marca: instrumento.marca || '',
      modelo: instrumento.modelo || '',
      numero_serie: instrumento.numero_serie || '',
      estado: instrumento.estado || 'Disponible',
      descripcion: instrumento.descripcion || '',
    });
    setEditando(instrumento.id);
    setMostrarFormulario(true);
  };

  /**
   * Eliminar instrumento
   */
  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este instrumento?')) return;

    try {
      await api.delete(`/api/instrumentos/${id}/`);
      setToast({ visible: true, message: 'Instrumento eliminado correctamente', type: 'success' });
      setInstrumentos((prev) => prev.filter((instr) => instr.id !== id));
    } catch (error) {
      console.error('Error al eliminar:', error);
      setToast({ visible: true, message: 'Error al eliminar instrumento', type: 'error' });
    }
  };

  const handleDesasignar = async (id) => {
    if (!window.confirm('¿Confirmas desasignar este instrumento y dejarlo disponible?')) return;

    try {
      const response = await api.post(`/api/instrumentos/${id}/desasignar/`, {});
      setToast({ visible: true, message: response.data.message || 'Instrumento desasignado', type: 'success' });
      setInstrumentos((prev) => prev.map((instr) => instr.id === id ? response.data.instrumento || { ...instr, estado: 'Disponible', usuario: null } : instr));
      if (response.data.instrumento?.usuario === null) {
        cargarEstudiantes();
      }
    } catch (error) {
      console.error('Error al desasignar:', error);
      const mensaje = error.response?.data?.error || 'Error al desasignar instrumento';
      setToast({ visible: true, message: mensaje, type: 'error' });
    }
  };

  const abrirModalMantenimiento = (instrumento) => {
    setInstrumentoMantenimiento(instrumento);
    setMotivoMantenimiento('');
    setMostrarModalMantenimiento(true);
  };

  const handleEnviarMantenimiento = async () => {
    if (!motivoMantenimiento.trim()) {
      setToast({ visible: true, message: 'El motivo técnico es obligatorio', type: 'error' });
      return;
    }

    if (!instrumentoMantenimiento) {
      setToast({ visible: true, message: 'Instrumento inválido para mantenimiento', type: 'error' });
      return;
    }

    try {
      const response = await api.post(
        `/api/instrumentos/${instrumentoMantenimiento.id}/mantenimiento/`,
        { motivo_tecnico: motivoMantenimiento.trim() },
      );
      setToast({ visible: true, message: response.data.message || 'Instrumento enviado a mantenimiento', type: 'success' });
      setMostrarModalMantenimiento(false);
      setInstrumentoMantenimiento(null);
      setMotivoMantenimiento('');
      cargarInstrumentos();
    } catch (error) {
      console.error('Error al reportar mantenimiento:', error);
      const mensaje = error.response?.data?.error || 'Error al reportar mantenimiento';
      setToast({ visible: true, message: mensaje, type: 'error' });
    }
  };

  /**
   * Asignar instrumento a estudiante
   */
  const handleAsignar = async () => {
    if (!estudianteSeleccionado) {
      setToast({ visible: true, message: 'Selecciona un estudiante', type: 'error' });
      return;
    }

    try {
      const response = await api.post(
        `/api/instrumentos/${instrumentoAAsignar}/asignar/`,
        { estudiante_id: parseInt(estudianteSeleccionado) },
      );
      
      setToast({ visible: true, message: response.data.message, type: 'success' });
      setMostrarAsignacion(false);
      setInstrumentoAAsignar(null);
      setEstudianteSeleccionado('');
      cargarInstrumentos();
    } catch (error) {
      console.error('Error al asignar:', error);
      const mensaje = error.response?.data?.error || 'Error al asignar instrumento';
      setToast({ visible: true, message: mensaje, type: 'error' });
    }
  };

  /**
   * Liberar instrumento
   */
  const handleLiberar = async (id) => {
    if (!window.confirm('¿Deseas liberar este instrumento?')) return;

    try {
      const response = await api.post(`/api/instrumentos/${id}/liberar/`, {});
      
      setToast({ visible: true, message: response.data.message, type: 'success' });
      cargarInstrumentos();
    } catch (error) {
      console.error('Error al liberar:', error);
      const mensaje = error.response?.data?.error || 'Error al liberar instrumento';
      setToast({ visible: true, message: mensaje, type: 'error' });
    }
  };

  /**
   * Aplicar filtros
   */
  const handleFiltrar = () => {
    cargarInstrumentos();
  };

  const instrumentosFiltrados = instrumentos.filter(inst => {
    if (filtroEstado && inst.estado !== filtroEstado) return false;
    if (filtroTipo && inst.tipo !== filtroTipo) return false;
    return true;
  });

  return (
    <div className="gestion-instrumentos">
      {/* Toast */}
      <Toast {...toast} onClose={() => setToast({ ...toast, visible: false })} />

      <div className="container-fluid py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-0">
              <i className="bi bi-music me-2"></i>Gestión de Instrumentos
            </h2>
            <p className="text-muted small">Administra el inventario de instrumentos de la banda</p>
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              limpiarFormulario();
              setMostrarFormulario(true);
            }}
          >
            <i className="bi bi-plus-circle me-2"></i>Registrar Instrumento
          </button>
        </div>

        {/* Filtros */}
        <div className="card mb-4 shadow-sm border-0">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label fw-bold">Filtrar por Estado</label>
                <select
                  className="form-select"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="Disponible">Disponible</option>
                  <option value="Asignado">Asignado</option>
                  <option value="En reparación">En reparación</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="En Taller">En Taller</option>
                  <option value="Dañado">Dañado</option>
                  <option value="Extraviado">Extraviado</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold">Filtrar por Tipo</label>
                <select
                  className="form-select"
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="Viento">Viento</option>
                  <option value="Percusión">Percusión</option>
                  <option value="Cuerda">Cuerda</option>
                  <option value="Metales">Metales</option>
                </select>
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button className="btn btn-outline-secondary w-100" onClick={handleFiltrar}>
                  <i className="bi bi-funnel me-2"></i>Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Instrumentos */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        ) : (
          <div className="row">
            {instrumentosFiltrados.length === 0 ? (
              <div className="col-12">
                <div className="alert alert-info text-center">
                  <i className="bi bi-info-circle me-2"></i>
                  No hay instrumentos que coincidan con los filtros
                </div>
              </div>
            ) : (
              instrumentosFiltrados.map(instrumento => (
                <div key={instrumento.id} className="col-lg-6 col-xl-4 mb-4">
                  <div className="card h-100 shadow-sm border-0 instrumento-card">
                    <div className={`card-header bg-${instrumento.estado === 'Disponible' ? 'success' : 'warning'} text-white`}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h5 className="card-title mb-1">{instrumento.nombre}</h5>
                          <small className="text-white-50">{instrumento.numero_serie}</small>
                        </div>
                        <span className={`badge bg-${instrumento.estado === 'Disponible' ? 'light' : 'dark'}`}>
                          {instrumento.estado}
                        </span>
                      </div>
                    </div>
                    <div className="card-body">
                      <dl className="row small mb-3">
                        <dt className="col-sm-5 fw-bold">Tipo:</dt>
                        <dd className="col-sm-7">{instrumento.tipo}</dd>
                        
                        <dt className="col-sm-5 fw-bold">Marca:</dt>
                        <dd className="col-sm-7">{instrumento.marca}</dd>
                        
                        <dt className="col-sm-5 fw-bold">Modelo:</dt>
                        <dd className="col-sm-7">{instrumento.modelo}</dd>
                        
                        {instrumento.usuario_nombre && (
                          <>
                            <dt className="col-sm-5 fw-bold">Asignado a:</dt>
                            <dd className="col-sm-7">
                              <small>{instrumento.usuario_nombre}</small>
                            </dd>
                          </>
                        )}
                      </dl>
                      {instrumento.descripcion && (
                        <p className="card-text small text-muted mb-3">
                          {instrumento.descripcion}
                        </p>
                      )}
                    </div>
                    <div className="card-footer bg-light d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary flex-grow-1"
                        onClick={() => handleEditar(instrumento)}
                      >
                        <i className="bi bi-pencil me-1"></i>Editar
                      </button>
                      
                      {instrumento.estado === 'Disponible' ? (
                        <button
                          className="btn btn-sm btn-outline-success flex-grow-1"
                          onClick={() => {
                            setInstrumentoAAsignar(instrumento.id);
                            setMostrarAsignacion(true);
                          }}
                        >
                          <i className="bi bi-person-check me-1"></i>Asignar
                        </button>
                      ) : instrumento.estado === 'Asignado' ? (
                        <button
                          className="btn btn-sm btn-outline-warning flex-grow-1"
                          onClick={() => handleDesasignar(instrumento.id)}
                        >
                          <i className="bi bi-person-x me-1"></i>Desasignar
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-secondary flex-grow-1"
                          disabled
                        >
                          <i className="bi bi-slash-circle me-1"></i>No disponible
                        </button>
                      )}

                      {instrumento.estado !== 'En Taller' && instrumento.estado !== 'Mantenimiento' && instrumento.estado !== 'En Mantenimiento' && instrumento.estado !== 'Dañado' && instrumento.estado !== 'Extraviado' && (
                        <button
                          className="btn btn-sm btn-outline-warning flex-grow-1"
                          onClick={() => abrirModalMantenimiento(instrumento)}
                        >
                          <i className="bi bi-wrench me-1"></i>Mantenimiento
                        </button>
                      )}

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleEliminar(instrumento.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {mostrarModalMantenimiento && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="bi bi-wrench me-2"></i>Reportar Mantenimiento
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMostrarModalMantenimiento(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Instrumento: <strong>{instrumentoMantenimiento?.nombre}</strong>
                </p>
                <div className="mb-3">
                  <label className="form-label fw-bold">Motivo Técnico *</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={motivoMantenimiento}
                    onChange={(e) => setMotivoMantenimiento(e.target.value)}
                    placeholder="Describe el motivo técnico del daño o revisión"
                  />
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMostrarModalMantenimiento(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={handleEnviarMantenimiento}
                >
                  <i className="bi bi-send me-1"></i>Enviar a Mantenimiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Formulario de Instrumento */}
      {mostrarFormulario && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className={`bi bi-${editando ? 'pencil' : 'plus'} me-2`}></i>
                  {editando ? 'Editar Instrumento' : 'Nuevo Instrumento'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={limpiarFormulario}
                  disabled={loading}
                ></button>
              </div>

              <form onSubmit={handleGuardar}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold">Nombre *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleFormChange}
                        placeholder="Ej. Bombo"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold">Tipo *</label>
                      <select
                        className="form-select"
                        name="tipo"
                        value={formData.tipo}
                        onChange={handleFormChange}
                      >
                        <option value="Viento">Viento</option>
                        <option value="Percusión">Percusión</option>
                        <option value="Cuerda">Cuerda</option>
                        <option value="Metales">Metales</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold">Marca</label>
                      <input
                        type="text"
                        className="form-control"
                        name="marca"
                        value={formData.marca}
                        onChange={handleFormChange}
                        placeholder="Ej. Yamaha"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold">Número de Serie *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="numero_serie"
                        value={formData.numero_serie}
                        onChange={handleFormChange}
                        placeholder="Ej. SN-2024-001"
                        required
                        disabled={!!editando}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-bold">Estado</label>
                      <select
                        className="form-select"
                        name="estado"
                        value={formData.estado}
                        onChange={handleFormChange}
                      >
                        <option value="Disponible">Disponible</option>
                        <option value="Asignado">Asignado</option>
                        <option value="En reparación">En reparación</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={limpiarFormulario}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4"
                    disabled={loading}
                  >
                    {loading ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                    ) : (
                      <><i className="bi bi-check-circle me-2"></i>{editando ? 'Actualizar' : 'Crear'}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Asignar Instrumento */}
      {mostrarAsignacion && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="bi bi-person-check me-2"></i>Asignar Instrumento
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setMostrarAsignacion(false);
                    setEstudianteSeleccionado('');
                  }}
                ></button>
              </div>

              <div className="modal-body">
                <p className="text-muted mb-3">
                  Selecciona el estudiante al que deseas asignar este instrumento:
                </p>
                <select
                  className="form-select form-select-lg"
                  value={estudianteSeleccionado}
                  onChange={(e) => setEstudianteSeleccionado(e.target.value)}
                >
                  <option value="">-- Selecciona un estudiante --</option>
                  {estudiantes.map(est => (
                    <option key={est.id} value={est.id}>
                      {est.nombre_completo} ({est.cedula})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setMostrarAsignacion(false);
                    setEstudianteSeleccionado('');
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleAsignar}
                >
                  <i className="bi bi-check-circle me-2"></i>Asignar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionInstrumentos;