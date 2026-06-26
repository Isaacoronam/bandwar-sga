import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

function GestionarPreguntas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [examen, setExamen] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para nueva pregunta
  const [advertenciaCargar, setAdvertenciaCargar] = useState('');
  const [preguntaForm, setPreguntaForm] = useState({ enunciado: '', tipo: 'Seleccion Simple', valor_puntos: 1 });
  
  // Estado para opciones
  const [optionForms, setOptionForms] = useState({});
  const [showFormFor, setShowFormFor] = useState({});
  
  // Estado para edición
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchContenido = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/profesor/examenes/${id}/`);
      const data = response.data;
      setExamen(data);
      setPreguntas(Array.isArray(data.preguntas) ? data.preguntas : []);
    } catch (err) {
      setError(err.message || 'Error cargando preguntas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchContenido();
  }, [id, token]);

  // Cálculos globales de puntos
  const sumaActualPreguntas = preguntas.reduce((acc, curr) => acc + parseFloat(curr.valor_puntos || 0), 0);
  const puntosDisponibles = 20 - sumaActualPreguntas;

  // --- MANEJO DE NUEVA PREGUNTA ---
  const handlePreguntaChange = (event) => {
    const { name, value } = event.target;
    let nuevoValor = value;

    if (name === 'valor_puntos') {
      if (value !== '') {
        const normalizado = String(value).replace(',', '.');
        nuevoValor = parseFloat(normalizado);
        // Bloqueo estricto: auto-corrige si se pasa del límite disponible
        if (nuevoValor > puntosDisponibles) {
          nuevoValor = puntosDisponibles;
          setAdvertenciaCargar(`Se ajustó al máximo disponible (${puntosDisponibles.toFixed(2)} pts).`);
        } else {
          setAdvertenciaCargar('');
        }
      }
    }

    setPreguntaForm((prev) => ({
      ...prev,
      [name]: nuevoValor,
    }));
  };

  const handleAddPregunta = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (!preguntaForm.enunciado.trim()) {
      setError('El enunciado es obligatorio.');
      setLoading(false);
      return;
    }

    const puntos = parseFloat(String(preguntaForm.valor_puntos).replace(',', '.'));
    if (isNaN(puntos) || puntos <= 0 || puntos > 20) {
      setError('Los puntos deben ser mayores a cero y no exceder 20.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/preguntas/', {
        examen: id,
        enunciado: preguntaForm.enunciado.trim(),
        tipo: preguntaForm.tipo,
        valor_puntos: puntos,
      });

      setPreguntaForm({ enunciado: '', tipo: 'Seleccion Simple', valor_puntos: 1 });
      setAdvertenciaCargar('');
      await fetchContenido();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al crear la pregunta');
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJO DE EDICIÓN Y ELIMINACIÓN DE PREGUNTAS ---
  const handleDeletePregunta = async (preguntaId) => {
    if (!window.confirm('¿Eliminar esta pregunta y todas sus opciones?')) return;
    try {
      await api.delete(`/api/preguntas/${preguntaId}/`);
      await fetchContenido();
    } catch (err) {
      setError('Error al eliminar la pregunta.');
    }
  };

  const iniciarEdicion = (pregunta) => {
    setEditandoId(pregunta.id);
    setEditForm({
      enunciado: pregunta.enunciado,
      tipo: pregunta.tipo,
      valor_puntos: parseFloat(pregunta.valor_puntos),
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditForm({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    let nuevoValor = value;

    if (name === 'valor_puntos') {
      if (value !== '') {
        const normalizado = String(value).replace(',', '.');
        nuevoValor = parseFloat(normalizado);
        // Calcular puntos disponibles ignorando la pregunta que se está editando
        const sumaSinEditada = preguntas.reduce((acc, curr) => curr.id === editandoId ? acc : acc + parseFloat(curr.valor_puntos || 0), 0);
        const dispEdicion = 20 - sumaSinEditada;
        
        if (nuevoValor > dispEdicion) {
          nuevoValor = dispEdicion;
          alert(`El máximo disponible es ${dispEdicion.toFixed(2)} pts.`);
        }
      }
    }
    setEditForm((prev) => ({ ...prev, [name]: nuevoValor }));
  };

  const guardarEdicion = async (preguntaId) => {
    try {
      await api.patch(`/api/preguntas/${preguntaId}/`, editForm);
      setEditandoId(null);
      await fetchContenido();
    } catch (err) {
      setError('Error al actualizar la pregunta.');
    }
  };

  // --- MANEJO DE OPCIONES ---
  const handleOptionChange = (questionId, field, value) => {
    setOptionForms((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: field === 'es_correcta' ? value === 'true' : value,
      },
    }));
  };

  const toggleOptionForm = (questionId) => {
    setShowFormFor((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleAddOpcion = async (questionId) => {
    setError(null);
    const optionData = optionForms[questionId] || { texto: '', es_correcta: false };
    if (!optionData.texto?.trim()) {
      setError('El texto de la opción es obligatorio.');
      return;
    }

    try {
      await api.post('/api/opciones/', {
        pregunta: questionId,
        texto: optionData.texto.trim(),
        es_correcta: optionData.es_correcta,
      });
      setOptionForms((prev) => ({ ...prev, [questionId]: { texto: '', es_correcta: false } }));
      await fetchContenido();
    } catch (err) {
      setError(err.response?.data?.es_correcta?.[0] || 'Error al guardar la opción');
    }
  };

  const handleDeleteOpcion = async (opcionId) => {
    if (!window.confirm('¿Eliminar esta opción?')) return;
    try {
      await api.delete(`/api/opciones/${opcionId}/`);
      await fetchContenido();
    } catch (err) {
      setError('Error al eliminar la opción.');
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('es-VE', {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value));
  };

  if (loading) {
    return (
      <div className="container py-4 text-center">
        <div className="spinner-border text-primary mt-5" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2>Gestionar preguntas</h2>
          <p className="text-muted">Agrega, edita y administra el contenido del examen.</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/profesor/evaluaciones')}>
          Volver a exámenes
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Aviso:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <div className="row g-4">
        {/* PANEL IZQUIERDO: NUEVA PREGUNTA */}
        <div className="col-md-4">
          <div className="card shadow-sm p-4 h-100">
            <h5 className="mb-3">Nueva pregunta</h5>
            <form onSubmit={handleAddPregunta}>
              <div className="alert alert-info py-2 d-flex justify-content-between">
                <span>Total asignado:</span>
                <strong>{sumaActualPreguntas.toFixed(2)} / 20.00 pts</strong>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Enunciado</label>
                <textarea
                  className="form-control" rows="4" name="enunciado"
                  value={preguntaForm.enunciado} onChange={handlePreguntaChange} maxLength={500} required
                  disabled={puntosDisponibles <= 0}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Tipo de pregunta</label>
                <select className="form-select" name="tipo" value={preguntaForm.tipo} onChange={handlePreguntaChange} disabled={puntosDisponibles <= 0}>
                  <option value="Seleccion Simple">Selección Simple</option>
                  <option value="Verdadero/Falso">Verdadero / Falso</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Puntos (Máx disponible: {puntosDisponibles.toFixed(2)})</label>
                <input
                  type="number"
                  className={`form-control ${advertenciaCargar ? 'border-warning' : ''}`}
                  name="valor_puntos"
                  value={preguntaForm.valor_puntos}
                  onChange={handlePreguntaChange}
                  min="0.25" max={puntosDisponibles > 0 ? puntosDisponibles : 0} step="0.25" required
                  disabled={puntosDisponibles <= 0}
                />
                {advertenciaCargar && <div className="text-warning mt-1 small fw-bold">{advertenciaCargar}</div>}
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={puntosDisponibles <= 0 || !preguntaForm.valor_puntos}>
                {puntosDisponibles <= 0 ? 'Límite de 20 pts alcanzado' : 'Agregar pregunta'}
              </button>
            </form>
          </div>
        </div>

        {/* PANEL DERECHO: LISTA DE PREGUNTAS */}
        <div className="col-md-8">
          <div className="card shadow-sm p-4">
            <div className="mb-4 border-bottom pb-3">
              <h5 className="mb-1">Preguntas del examen</h5>
              <p className="text-muted mb-0 fw-bold">{examen?.titulo || examen?.nombre}</p>
              <p className="text-muted small mb-0">Apertura: {formatDateTime(examen?.fecha_apertura)} | Cierre: {formatDateTime(examen?.fecha_cierre)}</p>
            </div>

            {preguntas.length === 0 ? (
              <div className="alert alert-secondary">No hay preguntas agregadas todavía.</div>
            ) : (
              preguntas.map((pregunta) => {
                const optionForm = optionForms[pregunta.id] || { texto: '', es_correcta: false };
                
                // MODO EDICIÓN
                if (editandoId === pregunta.id) {
                  return (
                    <div key={pregunta.id} className="mb-4 border border-primary rounded-3 p-3 bg-light">
                      <h6 className="text-primary mb-3">Editando Pregunta</h6>
                      <input className="form-control mb-2" name="enunciado" value={editForm.enunciado} onChange={handleEditChange} />
                      <div className="d-flex gap-2 mb-3">
                        <select className="form-select w-50" name="tipo" value={editForm.tipo} onChange={handleEditChange}>
                          <option value="Seleccion Simple">Selección Simple</option>
                          <option value="Verdadero/Falso">Verdadero / Falso</option>
                        </select>
                        <input type="number" className="form-control w-50" name="valor_puntos" value={editForm.valor_puntos} onChange={handleEditChange} step="0.25" min="0.25" />
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-primary" onClick={() => guardarEdicion(pregunta.id)}>Guardar cambios</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={cancelarEdicion}>Cancelar</button>
                      </div>
                    </div>
                  );
                }

                // VISTA NORMAL
                return (
                  <div key={pregunta.id} className="mb-4">
                    <div className="border rounded-3 p-3">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h6 className="mb-1">{pregunta.enunciado}</h6>
                          <small className="text-muted">
                            {pregunta.tipo === 'Verdadero/Falso' ? 'Verdadero / Falso' : 'Selección múltiple'} · {pregunta.valor_puntos} pts
                          </small>
                        </div>
                        <div className="d-flex gap-2 flex-wrap justify-content-end">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => iniciarEdicion(pregunta)}>Editar</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePregunta(pregunta.id)}>Eliminar</button>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => toggleOptionForm(pregunta.id)}>
                            {showFormFor[pregunta.id] ? 'Ocultar opciones' : 'Agregar opción'}
                          </button>
                        </div>
                      </div>

                      <ul className="list-group mb-3">
                        {(pregunta.opciones || []).map((opcion) => (
                          <li key={opcion.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <span>{opcion.texto || opcion.valor}</span>
                            <div>
                              {opcion.es_correcta || opcion.correcta || opcion.is_correct ? (
                                <span className="badge bg-success me-2">Correcta</span>
                              ) : null}
                              <button className="btn btn-sm text-danger border-0 p-0" onClick={() => handleDeleteOpcion(opcion.id)} title="Eliminar opción">
                                ❌
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {showFormFor[pregunta.id] && (
                        <div className="border-top pt-3 mt-2 bg-light p-2 rounded">
                          <div className="mb-2">
                            <input
                              type="text" className="form-control form-control-sm"
                              value={optionForm.texto} onChange={(e) => handleOptionChange(pregunta.id, 'texto', e.target.value)}
                              placeholder="Texto de la opción..."
                            />
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input" type="checkbox" id={`correcta-${pregunta.id}`}
                                checked={optionForm.es_correcta} onChange={(e) => handleOptionChange(pregunta.id, 'es_correcta', e.target.checked ? 'true' : 'false')}
                              />
                              <label className="form-check-label small" htmlFor={`correcta-${pregunta.id}`}>Es respuesta correcta</label>
                            </div>
                            <button className="btn btn-sm btn-success" onClick={() => handleAddOpcion(pregunta.id)}>Guardar opción</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GestionarPreguntas;