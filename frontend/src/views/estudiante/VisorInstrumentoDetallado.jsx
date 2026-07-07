import { useEffect, useState } from 'react';
import Visor3D from '../../components/3d/Visor3D';
import api from '../../api/axiosConfig';

/**
 * Componente para visualizar el instrumento asignado al estudiante
 * Integra el Visor 3D y registra la interacción del usuario
 */
function EstudianteVisorInstrumento() {
  const [instrumento, setInstrumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar instrumento asignado del estudiante
  useEffect(() => {
    cargarInstrumentoPrincipal();
  }, []);

  const cargarInstrumentoPrincipal = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

      if (!usuario.id) {
        setError('Usuario no identificado');
        return;
      }

      // Obtener instrumentos del usuario actual
        const response = await api.get(`/api/instrumentos/?usuario_id=${usuario.id}`);

      if (response.data && response.data.length > 0) {
        setInstrumento(response.data[0]);
      } else {
        setError('No tienes instrumento asignado');
      }
    } catch (err) {
      console.error('Error al cargar instrumento:', err);
      setError('Error al cargar tu instrumento asignado');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registrar interacción del usuario con el visor 3D
   */
  const handleInteraction = async (stats) => {
    try {
      const token = localStorage.getItem('access_token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

      if (!instrumento || !usuario.id) return;

      const payload = {
        instrumento: instrumento.id,
        estudiante: usuario.id,
        ...stats,
        puntos_calientes_visitados: [], // Aquí puedes agregar lógica para puntos clicables
      };

      // Enviar a API cada 10 segundos
      await api.post('/api/visor/interacciones/', payload);
    } catch (err) {
      console.warn('No se pudo registrar interacción:', err);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '500px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  return (
    <div className="visor-container">
      <div className="container-fluid py-4">
        <h2 className="mb-4">
          <i className="bi bi-cube-3d me-2"></i>
          Mi Instrumento 3D
        </h2>

        {instrumento && (
          <div className="row">
            <div className="col-lg-8">
              {/* Visor 3D */}
              {instrumento.modelo_3d ? (
                <Visor3D
                  modelPath={instrumento.modelo_3d}
                  nombre={instrumento.nombre}
                  altura="600px"
                  onInteraction={handleInteraction}
                />
              ) : (
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  Este instrumento aún no tiene modelo 3D disponible
                </div>
              )}
            </div>

            {/* Información del instrumento */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-lg">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Información
                  </h5>
                </div>
                <div className="card-body">
                  <dl>
                    <dt className="fw-bold">Nombre</dt>
                    <dd>{instrumento.nombre}</dd>

                    <dt className="fw-bold">Tipo</dt>
                    <dd>
                      <span className="badge bg-primary">{instrumento.tipo}</span>
                    </dd>

                    <dt className="fw-bold">Marca</dt>
                    <dd>{instrumento.marca}</dd>

                    <dt className="fw-bold">Modelo</dt>
                    <dd>{instrumento.modelo}</dd>

                    <dt className="fw-bold">Número de Serie</dt>
                    <dd>
                      <code>{instrumento.numero_serie}</code>
                    </dd>

                    <dt className="fw-bold">Estado</dt>
                    <dd>
                      <span className={`badge bg-${instrumento.estado === 'Disponible' ? 'success' : 'warning'}`}>
                        {instrumento.estado}
                      </span>
                    </dd>
                  </dl>

                  {instrumento.descripcion && (
                    <div className="mt-3 pt-3 border-top">
                      <h6>Descripción Técnica</h6>
                      <p className="small text-muted">{instrumento.descripcion}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Instrucciones */}
              <div className="card border-0 shadow-sm mt-4">
                <div className="card-header bg-info text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-lightbulb me-2"></i>
                    Controles 3D
                  </h5>
                </div>
                <div className="card-body small">
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <strong>🖱️ Click derecho + arrastrar:</strong> Rotar el modelo
                    </li>
                    <li className="mb-2">
                      <strong>🔍 Rueda del ratón:</strong> Hacer zoom
                    </li>
                    <li className="mb-2">
                      <strong>🖱️ Click izquierdo + arrastrar:</strong> Panorámica
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EstudianteVisorInstrumento;
