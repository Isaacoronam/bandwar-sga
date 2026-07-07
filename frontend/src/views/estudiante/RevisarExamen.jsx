import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const getOptionState = (opcion, selectedId, correctId) => {
  const isSelected = opcion.id === selectedId;
  const isCorrect = opcion.id === correctId;

  if (isSelected && isCorrect) {
    return { className: 'list-group-item-success', icon: 'bi-check-circle-fill', label: 'Seleccionada y correcta' };
  }

  if (isSelected && !isCorrect) {
    return { className: 'list-group-item-danger', icon: 'bi-x-circle-fill', label: 'Seleccionada e incorrecta' };
  }

  if (isCorrect) {
    return { className: 'list-group-item-warning', icon: 'bi-info-circle', label: 'Respuesta correcta' };
  }

  return { className: 'text-muted', icon: null, label: null };
};

function RevisarExamen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [examen, setExamen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRevision = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get(`/api/estudiante/examenes/${id}/`);
        setExamen(response.data);
      } catch (err) {
        setError(err.message || 'Error al cargar la revisión');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchRevision();
    }
  }, [id, token]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando revisión...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!examen) {
    return null;
  }

  const notaFinal = examen.calificacion_final ?? examen.nota ?? examen.resultado?.nota ?? null;
  const titulo = examen.titulo || examen.nombre || 'Evaluación';
  const preguntas = Array.isArray(examen.preguntas) ? examen.preguntas : [];

  return (
    <div className="container py-4">
      <div className="rounded-4 bg-dark text-white p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
          <div>
            <h2 className="mb-1">Revisión: {titulo}</h2>
            <p className="mb-0 text-white-50">Vista de solo lectura de tus respuestas y la calificación final.</p>
          </div>
          <div className="text-md-end">
            <span className="badge bg-warning text-dark fs-6">Nota Final: {notaFinal !== null ? `${notaFinal} / 20` : 'No disponible'}</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-muted mb-1">Apertura: {formatDateTime(examen.fecha_apertura)}</p>
        <p className="text-muted">Cierre: {formatDateTime(examen.fecha_cierre)}</p>
      </div>

      {preguntas.length === 0 ? (
        <div className="alert alert-secondary">No hay preguntas registradas para esta revisión.</div>
      ) : (
        preguntas.map((pregunta, index) => {
          const selectedId = pregunta.respuesta_seleccionada_id ?? pregunta.selected_option_id ?? pregunta.respuesta_usuario?.id ?? null;
          const correctId = pregunta.respuesta_correcta_id ?? pregunta.correct_option_id ?? pregunta.opciones?.find((op) => op.es_correcta || op.correcta || op.is_correct)?.id ?? null;

          return (
            <div key={pregunta.id} className="card mb-4 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="card-title mb-1">Pregunta {index + 1}</h5>
                    <p className="card-text mb-0">{pregunta.enunciado}</p>
                  </div>
                  <span className="badge bg-secondary">{pregunta.tipo === 'vf' ? 'Verdadero / Falso' : pregunta.tipo === 'visual' ? 'Visual' : 'Selección múltiple'}</span>
                </div>

                <ul className="list-group">
                  {(pregunta.opciones || []).map((opcion) => {
                    const state = getOptionState(opcion, selectedId, correctId);
                    return (
                      <li key={opcion.id} className={`list-group-item d-flex justify-content-between align-items-center ${state.className}`}>
                        <div>
                          <span className={`${state.className.includes('text-muted') ? 'text-muted' : ''}`}>
                            {opcion.texto || opcion.valor || opcion.label}
                          </span>
                        </div>
                        {state.icon && (
                          <span className="d-flex align-items-center gap-2">
                            <i className={`bi ${state.icon}`} />
                            <small>{state.label}</small>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })
      )}

      <div className="d-flex justify-content-end">
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/estudiante/evaluaciones')}>
          Volver a mis evaluaciones
        </button>
      </div>
    </div>
  );
}

export default RevisarExamen;
