import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import './MisNotas.css';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('es-VE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
};

function MisNotas() {
  const { usuario, token } = useAuth();
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotas = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get('/api/estudiante/notas/');
        console.log('✅ Notas cargadas:', response.data);
        
        if (Array.isArray(response.data)) {
          setNotas(response.data);
        } else if (response.data && typeof response.data === 'object') {
          setNotas(response.data.results || []);
        } else {
          setNotas([]);
        }
      } catch (err) {
        console.error('❌ Error al obtener notas:', err);
        
        if (err.response?.status === 404) {
          setNotas([]);
        } else if (err.response?.status === 401) {
          setError('Sesión expirada. Por favor inicia sesión nuevamente.');
        } else {
          setError(err.response?.data?.detail || err.message || 'Error al obtener calificaciones');
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchNotas();
    }
  }, [token]);

  // Calcular promedio general
  const calcularPromedio = () => {
    if (notas.length === 0) return 0;
    const suma = notas.reduce((acc, nota) => acc + parseFloat(nota.nota_obtenida), 0);
    return (suma / notas.length).toFixed(2);
  };

  // Calcular cantidad de aprobados y reprobados
  const estadisticas = () => {
    const aprobados = notas.filter(n => n.estado === 'Aprobado').length;
    const reprobados = notas.filter(n => n.estado === 'Reprobado').length;
    return { aprobados, reprobados };
  };

  const { aprobados, reprobados } = estadisticas();
  const promedio = calcularPromedio();

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando calificaciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="row g-4 mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h2 className="card-title mb-1">
                    <i className="bi bi-file-earmark-check me-2"></i>
                    Mis Calificaciones
                  </h2>
                  <p className="card-text text-muted mb-0">Historial de exámenes completados y tus notas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 bg-primary text-white h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-uppercase fw-bold opacity-75">Promedio General</small>
                  <h3 className="fw-bold mb-0">{promedio}/20</h3>
                </div>
                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
                  <i className="bi bi-graph-up text-primary fs-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm border-0 bg-success text-white h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-uppercase fw-bold opacity-75">Exámenes Aprobados</small>
                  <h3 className="fw-bold mb-0">{aprobados}</h3>
                </div>
                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
                  <i className="bi bi-check-circle text-success fs-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm border-0 bg-danger text-white h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-uppercase fw-bold opacity-75">Exámenes Reprobados</small>
                  <h3 className="fw-bold mb-0">{reprobados}</h3>
                </div>
                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
                  <i className="bi bi-x-circle text-danger fs-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Notas */}
      <div className="row">
        <div className="col-md-12">
          <div className="card shadow-sm border-0">
            <div className="card-body p-0">
              {error && (
                <div className="alert alert-danger m-4" role="alert">
                  {error}
                </div>
              )}

              {notas.length === 0 ? (
                <div className="alert alert-secondary m-4 mb-0" role="alert">
                  <i className="bi bi-info-circle me-2"></i>
                  Aún no has completado ningún examen. Dirígete a "Mis Evaluaciones" para resolver exámenes disponibles.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light border-bottom">
                      <tr>
                        <th className="py-3 px-4">
                          <i className="bi bi-journal-text me-2"></i>
                          Examen
                        </th>
                        <th className="py-3 px-4">Descripción</th>
                        <th className="py-3 px-4 text-center">
                          <i className="bi bi-star me-2"></i>
                          Calificación
                        </th>
                        <th className="py-3 px-4 text-center">Estado</th>
                        <th className="py-3 px-4">Fecha Completado</th>
                        <th className="py-3 px-4">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notas.map((nota) => (
                        <tr key={nota.id} className="align-middle">
                          <td className="py-3 px-4">
                            <div className="fw-semibold">{nota.examen_titulo}</div>
                          </td>
                          <td className="py-3 px-4">
                            <small className="text-muted">{nota.examen_descripcion || '-'}</small>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="badge bg-info text-dark fw-bold" style={{ fontSize: '0.95rem' }}>
                              {nota.nota_obtenida}/20
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`badge ${
                                nota.estado === 'Aprobado' ? 'bg-success' : 'bg-danger'
                              } py-2 px-3`}
                            >
                              {nota.estado === 'Aprobado' ? (
                                <>
                                  <i className="bi bi-check-circle me-1"></i>
                                  Aprobado
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-x-circle me-1"></i>
                                  Reprobado
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <small className="text-muted">{formatDate(nota.fecha_completado)}</small>
                          </td>
                          <td className="py-3 px-4">
                            <small className="text-secondary">{nota.observaciones || '-'}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MisNotas;
