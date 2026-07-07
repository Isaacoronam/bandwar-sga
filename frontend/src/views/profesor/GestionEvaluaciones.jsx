import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-VE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getEstadoBadge = (fechaInicio, fechaCierre) => {
  const ahora = new Date();
  const inicio = fechaInicio ? new Date(fechaInicio) : null;
  const cierre = fechaCierre ? new Date(fechaCierre) : null;

  if (inicio && cierre && ahora >= inicio && ahora <= cierre) {
    return { label: 'Activo', variant: 'success' };
  }

  return { label: 'Cerrado', variant: 'danger' };
};

function GestionEvaluaciones() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notas, setNotas] = useState([]);
  const [notasLoading, setNotasLoading] = useState(false);
  const [notasError, setNotasError] = useState(null);
  const [showNotasModal, setShowNotasModal] = useState(false);
  const [selectedExamen, setSelectedExamen] = useState(null);

  const fetchEvaluaciones = async () => {
    setLoading(true);
    setError(null);
    setActionError(null);

    try {
      const response = await api.get('/api/profesor/examenes/');
      setEvaluaciones(response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al cargar evaluaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEvaluaciones();
    }
  }, [token]);

  const handleEliminar = async (evaluacionId) => {
    setActionError(null);
    const confirmacion = window.confirm('¿Estás seguro de eliminar este examen? Esta acción no se puede deshacer.');
    if (!confirmacion) return;

    try {
      const response = await api.delete(`/api/profesor/examenes/${evaluacionId}/`);
      if (response.status !== 204) {
        throw new Error('La eliminación no devolvió el estado esperado.');
      }
      setEvaluaciones((prev) => prev.filter((item) => item.id !== evaluacionId));
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message || 'Error al eliminar el examen');
    }
  };

  const handleVerNotas = async (examenId) => {
    try {
      setLoading(true);
      setActionError(null);
      setNotas([]);
      setNotasError(null);
      const examen = evaluaciones.find((item) => item.id === examenId) || null;
      setSelectedExamen(examen);
      const response = await api.get(`/api/profesor/examenes/${examenId}/intentos/`);
      setNotas(Array.isArray(response.data) ? response.data : []);
      setShowNotasModal(true);
    } catch (error) {
      console.error('Error al cargar notas:', error);
      setActionError('No se pudieron cargar las notas.');
    } finally {
      setLoading(false);
    }
  };

  const closeNotasModal = () => {
    setShowNotasModal(false);
    setSelectedExamen(null);
    setNotas([]);
    setNotasError(null);
    setNotasLoading(false);
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2>Gestión de Evaluaciones</h2>
          <p className="text-muted">Administra los exámenes y consulta las calificaciones registradas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/profesor/evaluaciones/nuevo')}>
          Crear nuevo examen
        </button>
      </div>

      {actionError && <div className="alert alert-danger">{actionError}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando exámenes...</span>
          </div>
        </div>
      ) : evaluaciones.length === 0 ? (
        <div className="alert alert-secondary">No hay exámenes registrados para este profesor.</div>
      ) : (
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
              {evaluaciones.map((examen) => (
                <tr key={examen.id}>
                  <td><strong>{examen.titulo || examen.nombre}</strong></td>
                  <td className="text-muted text-truncate" style={{ maxWidth: '200px' }}>{examen.descripcion || '-'}</td>
                  <td>{examen.duracion_minutos} min</td>
                  <td>
                    <span className="badge bg-secondary">{examen.intentos_permitidos || 1} intento(s)</span>
                  </td>
                  <td>
                    {(() => {
                      const estado = examen.estado || 'Desconocido';
                      const clase = estado === 'Publicado'
                        ? 'bg-success'
                        : estado === 'Borrador'
                          ? 'bg-warning text-dark'
                          : 'bg-danger';
                      return <span className={`badge ${clase}`}>{estado}</span>;
                    })()}
                  </td>
                  <td className="text-center">
                    <div className="btn-group btn-group-sm" role="group">
                      {/* Botón Preguntas */}
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => navigate(`/profesor/evaluaciones/${examen.id}/preguntas`)}
                        title="Gestionar Preguntas"
                      >
                        <i className="bi bi-question-circle"></i> Preguntas
                      </button>

                      {/* Botón Notas */}
                      <button
                        type="button"
                        className="btn btn-outline-info"
                        onClick={() => handleVerNotas(examen.id)}
                        title="Ver Calificaciones"
                      >
                        <i className="bi bi-journal-text"></i> Notas
                      </button>

                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => handleEliminar(examen.id)}
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
      )}

      {showNotasModal && (
        <div className="modal fade show d-block" role="dialog" aria-modal="true">
          <div className="modal-backdrop fade show"></div>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">Notas de {selectedExamen?.titulo || selectedExamen?.nombre}</h5>
                  <p className="mb-0 text-muted">Revisión por estudiante del rendimiento de la evaluación.</p>
                </div>
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={closeNotasModal}></button>
              </div>
              <div className="modal-body">
                {notasLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Cargando notas...</span>
                    </div>
                  </div>
                ) : notasError ? (
                  <div className="alert alert-danger">{notasError}</div>
                ) : notas.length === 0 ? (
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
                        {notas.map((item) => (
                          <tr key={item.id || `${item.estudiante?.id}-${item.fecha_envio}`}>
                            <td>{item.estudiante?.nombre_completo || item.estudiante?.email || 'Desconocido'}</td>
                            <td>{formatDateTime(item.fecha_envio)}</td>
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
                <button type="button" className="btn btn-secondary" onClick={closeNotasModal}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionEvaluaciones;
