import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
};

const getOptionKey = (pregunta, opcion) => `${pregunta.id}-${opcion.id}`;

function TomarExamen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [examen, setExamen] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [timer, setTimer] = useState(null);
  const [started, setStarted] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [score, setScore] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [intentoId, setIntentoId] = useState(null);

  useEffect(() => {
    const fetchExamen = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/estudiante/examenes/${id}/`);
        const data = response.data;
        setExamen(data);

        if (typeof data.duracion_minutos === 'number') {
          setTimer(null);
        }
      } catch (err) {
        setError(err.message || 'Error al obtener examen');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchExamen();
    }
  }, [id, token]);

  useEffect(() => {
    if (!started || timer === null || timer <= 0 || hasSubmitted) return undefined;

    const interval = window.setInterval(() => {
      setTimer((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [started, hasSubmitted]);

  useEffect(() => {
    if (timer === 0 && started && !hasSubmitted) {
      handleSubmit();
    }
  }, [timer, started, hasSubmitted]);

  const handleOptionChange = (preguntaId, opcionId) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: opcionId }));
  };

  const handleSubmit = async () => {
    if (!examen) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        respuestas: Object.entries(respuestas).map(([preguntaId, opcionId]) => ({ pregunta_id: Number(preguntaId), opcion_id: opcionId })),
      };

      const response = await api.post(`/api/estudiante/examenes/${id}/entregar/`, payload);
      const body = response.data;
      if (![200, 201].includes(response.status)) {
        if (response.status === 403) {
          setError('Ya has agotado tu único intento para este examen. Serás redirigido al listado.');
          setTimeout(() => navigate('/estudiante/evaluaciones'), 2000);
          return;
        }
        throw new Error(body?.detail || 'No fue posible enviar el examen');
      }

      setHasSubmitted(true);
      setScore(body?.calificacion_final || '0.00');
      setShowScoreModal(true);
    } catch (err) {
      setError(err.message || 'Error al entregar el examen');
    } finally {
      setSaving(false);
    }
  };

  const handleStartExam = async () => {
    if (!examen || typeof examen.duracion_minutos !== 'number') {
      setError('No se pudo iniciar el examen. Intenta nuevamente.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.post(`/api/estudiante/examenes/${id}/iniciar/`, {});
      const body = response.data;
      if (![200, 201].includes(response.status)) {
        if (response.status === 403) {
          setError('Ya has agotado tu único intento para este examen. Serás redirigido al listado.');
          setTimeout(() => navigate('/estudiante/evaluaciones'), 2000);
          return;
        }
        throw new Error(body?.detail || 'No fue posible iniciar el examen');
      }

      setIntentoId(body?.intento_id || null);
      setStarted(true);
      setTimer(examen.duracion_minutos * 60);
    } catch (err) {
      setError(err.message || 'Error al iniciar el examen');
    } finally {
      setSaving(false);
    }
  };

  const renderVisualQuestion = (pregunta) => {
    const hasImage = pregunta.imagen_url || pregunta.imagen || pregunta.url_referencia || pregunta.referencia_imagen;
    const referenceText = pregunta.referencia_texto || pregunta.referencia || pregunta.descripcion_visual;

    return (
      <div className="border rounded-3 bg-light p-3 mb-3">
        <h6 className="mb-3">Contenido visual de la pregunta</h6>
        {hasImage ? (
          <img
            src={pregunta.imagen_url || pregunta.imagen || pregunta.url_referencia || pregunta.referencia_imagen}
            alt="Referencia visual"
            className="img-fluid rounded"
          />
        ) : (
          <p className="text-muted mb-0">
            {referenceText || 'Esta pregunta incluye contenido de referencia visual. Responde con base en el enunciado.'}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando examen...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!examen) {
    return null;
  }

  const isExpired = timer === 0;
  const hasPreguntas = Array.isArray(examen.preguntas) && examen.preguntas.length > 0;

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2>{examen.titulo}</h2>
          <p className="text-muted mb-0">{examen.descripcion || 'Responde cada pregunta con atención. El cronómetro se encuentra en la esquina superior derecha.'}</p>
        </div>
        <div className="text-end">
          <small className="text-muted d-block">Tiempo restante</small>
          <span className={`badge rounded-pill ${isExpired ? 'bg-danger' : 'bg-primary'} fs-5`}>
            {timer !== null ? formatTime(timer) : '--:--'}
          </span>
        </div>
      </div>

      {!started ? (
        <div className="card p-4 mb-4">
          <p className="mb-3">
            Presiona <strong>Iniciar Examen</strong> para comenzar la cuenta regresiva. Una vez iniciado, el temporizador no se detiene.
          </p>
          <button className="btn btn-primary" type="button" onClick={handleStartExam} disabled={saving || hasSubmitted}>
            Iniciar Examen
          </button>
        </div>
      ) : !hasPreguntas ? (
        <div className="alert alert-warning">No se encontraron preguntas para este examen.</div>
      ) : (
        examen.preguntas.map((pregunta, index) => {
          const selected = respuestas[pregunta.id] || '';
          return (
            <div key={pregunta.id} className="card mb-4 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="card-title">Pregunta {index + 1}</h5>
                    <p className="card-text fw-semibold">{pregunta.enunciado}</p>
                  </div>
                  <span className="badge bg-secondary">{pregunta.tipo === 'Verdadero/Falso' ? 'Verdadero / Falso' : 'Selección múltiple'}</span>
                </div>

                {pregunta.tipo === 'visual' && renderVisualQuestion(pregunta)}

                <div className="list-group">
                  {pregunta.opciones.map((opcion) => (
                    <label
                      key={opcion.id}
                      className={`list-group-item list-group-item-action ${selected === opcion.id ? 'active text-white' : ''}`}
                    >
                      <input
                        className="form-check-input me-2"
                        type="radio"
                        name={`pregunta-${pregunta.id}`}
                        value={opcion.id}
                        checked={selected === opcion.id}
                        onChange={() => handleOptionChange(pregunta.id, opcion.id)}
                        disabled={!started || isExpired || saving}
                      />
                      {opcion.texto}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })
      )}

      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/estudiante/evaluaciones')}>
          Volver a evaluaciones
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!started || saving || isExpired || !hasPreguntas}
        >
          {saving ? 'Enviando...' : isExpired ? 'Entregando...' : 'Entregar examen'}
        </button>
      </div>

      {showScoreModal && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Resultado del examen</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowScoreModal(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-2">Tu examen ha sido calificado con éxito.</p>
                <div className="alert alert-success fs-4 text-center mb-0">
                  Nota obtenida: <strong>{Number(score).toFixed(2)}</strong> / 20.00
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowScoreModal(false)}>
                  Cerrar
                </button>
                <button type="button" className="btn btn-primary" onClick={() => navigate(`/estudiante/evaluaciones/${id}/revisar`)}>
                  Ver resultado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TomarExamen;
