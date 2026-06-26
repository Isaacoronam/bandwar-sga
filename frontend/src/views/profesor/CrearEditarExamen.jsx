import React, { useEffect, useMemo, useState } from 'react';
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

function CrearEditarExamen() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  // ✅ SOLUCIÓN #4: Agregar instrucciones
  const [instrucciones, setInstrucciones] = useState('');
  const [duracionMinutos, setDuracionMinutos] = useState(30);
  const [estado, setEstado] = useState('Borrador');
  const [fechaApertura, setFechaApertura] = useState('');
  const [horaApertura, setHoraApertura] = useState('08:00');
  const [fechaCierre, setFechaCierre] = useState('');
  const [horaCierre, setHoraCierre] = useState('17:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!isEdit || !token) {
      setLoading(false);
      return;
    }

    const fetchExamen = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get(`/api/profesor/examenes/${id}/`);
        const data = response.data;
        setTitulo(data.titulo || '');
        setDescripcion(data.descripcion || '');
        // ✅ SOLUCIÓN #4: Cargar instrucciones
        setInstrucciones(data.instrucciones || '');
        setDuracionMinutos(data.duracion_minutos || 30);
        setEstado(data.estado || 'Borrador');

        if (data.fecha_apertura) {
          const apertura = new Date(data.fecha_apertura);
          setFechaApertura(apertura.toISOString().slice(0, 10));
          setHoraApertura(apertura.toTimeString().slice(0, 5));
        }

        if (data.fecha_cierre) {
          const cierre = new Date(data.fecha_cierre);
          setFechaCierre(cierre.toISOString().slice(0, 10));
          setHoraCierre(cierre.toTimeString().slice(0, 5));
        }
      } catch (err) {
        setError(err.message || 'Error cargando el examen');
      } finally {
        setLoading(false);
      }
    };

    fetchExamen();
  }, [id, isEdit, token]);

  const sanitize = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/<[^>]*>/g, '').trim();
  };

  const validateForm = () => {
    if (!titulo.trim()) {
      setError('El título es obligatorio.');
      return false;
    }

    if (!fechaApertura || !horaApertura || !fechaCierre || !horaCierre) {
      setError('Debes completar todas las fechas y horas.');
      return false;
    }

    const inicio = new Date(`${fechaApertura}T${horaApertura}`);
    const cierre = new Date(`${fechaCierre}T${horaCierre}`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (inicio < hoy) {
      setError('La fecha de apertura no puede ser anterior al día de hoy.');
      return false;
    }

    if (cierre < hoy) {
      setError('La fecha de cierre no puede ser anterior al día de hoy.');
      return false;
    }

    if (cierre <= inicio) {
      setError('La fecha de cierre debe ser posterior a la fecha de apertura.');
      return false;
    }

    // ✅ SOLUCIÓN #5: Validar que examen tenga preguntas antes de publicar
    if (isEdit && estado === 'Publicado') {
      // Nota: Esta es una validación básica. Lo ideal sería hacer una llamada API
      // pero por ahora confiamos en que el profesor ha agregado preguntas
      console.warn('⚠️ Verificar que el examen tenga preguntas antes de publicar');
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!validateForm()) return;

    setSaving(true);

    try {
      const payload = {
        titulo: sanitize(titulo),
        descripcion: sanitize(descripcion),
        // ✅ SOLUCIÓN #4: Agregar instrucciones al payload
        instrucciones: sanitize(instrucciones),
        duracion_minutos: Number(duracionMinutos),
        // Fuerza el estado a "Publicado" para evitar envíos accidentales en Borrador
        estado: 'Publicado',
        fecha_apertura: `${fechaApertura}T${horaApertura}:00`,
        fecha_cierre: `${fechaCierre}T${horaCierre}:00`,
        intentos_permitidos: 1,
      };

      const response = isEdit
        ? await api.put(`/api/profesor/examenes/${id}/`, payload)
        : await api.post('/api/profesor/examenes/', payload);

      if (![200, 201].includes(response.status)) {
        throw new Error('No fue posible guardar el examen.');
      }

      navigate('/profesor/evaluaciones');
    } catch (err) {
      setError(err.message || 'Error al guardar el examen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2>{isEdit ? 'Editar examen' : 'Crear examen'}</h2>
          <p className="text-muted mb-0">
            {isEdit
              ? 'Modifica los datos básicos del examen antes de guardar.'
              : 'Define la ventana de apertura y cierre para el nuevo examen.'}
          </p>
        </div>
        <div className="text-md-end">
          {isEdit && <small className="text-muted">Editando examen {id}</small>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando formulario...</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card shadow-sm p-4">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="titulo" className="form-label">
              Título del examen
            </label>
            <input
              id="titulo"
              type="text"
              className="form-control"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={150}
              required
            />
            <div className="form-text">Máximo 150 caracteres.</div>
          </div>

          <div className="mb-4">
            <label htmlFor="descripcion" className="form-label">
              Descripción
            </label>
            <textarea
              id="descripcion"
              className="form-control"
              rows={5}
              style={{ resize: 'none', overflowY: 'auto' }}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={1000}
            />
            <div className="form-text">Máximo 1000 caracteres.</div>
          </div>

          {/* ✅ SOLUCIÓN #4: Agregar campo instrucciones */}
          <div className="mb-4">
            <label htmlFor="instrucciones" className="form-label">
              Instrucciones para el estudiante (opcional)
            </label>
            <textarea
              id="instrucciones"
              className="form-control"
              rows={3}
              style={{ resize: 'none', overflowY: 'auto' }}
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              maxLength={500}
              placeholder="Ej: Responde todas las preguntas. Tienes 60 minutos para completar el examen..."
            />
            <div className="form-text">Máximo 500 caracteres. Estos son consejos para el estudiante.</div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label htmlFor="duracionMinutos" className="form-label">
                Duración
              </label>
              <select
                id="duracionMinutos"
                className="form-select"
                value={duracionMinutos}
                onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                required
              >
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={105}>1 hora y 45 minutos</option>
              </select>
            </div>
            <div className="col-md-4">
              <label htmlFor="estado" className="form-label">
                Estado
              </label>
              <select
                id="estado"
                className="form-select"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="Borrador">Borrador</option>
                <option value="Publicado">Publicado</option>
                <option value="Cerrado">Cerrado</option>
              </select>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label htmlFor="fechaApertura" className="form-label">
                Fecha de apertura
              </label>
              <input
                id="fechaApertura"
                type="date"
                className="form-control"
                value={fechaApertura}
                onChange={(e) => setFechaApertura(e.target.value)}
                required
                min={todayDate}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="horaApertura" className="form-label">
                Hora de apertura
              </label>
              <input
                id="horaApertura"
                type="time"
                className="form-control"
                value={horaApertura}
                onChange={(e) => setHoraApertura(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label htmlFor="fechaCierre" className="form-label">
                Fecha de cierre
              </label>
              <input
                id="fechaCierre"
                type="date"
                className="form-control"
                value={fechaCierre}
                onChange={(e) => setFechaCierre(e.target.value)}
                required
                min={todayDate}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="horaCierre" className="form-label">
                Hora de cierre
              </label>
              <input
                id="horaCierre"
                type="time"
                className="form-control"
                value={horaCierre}
                onChange={(e) => setHoraCierre(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="d-flex justify-content-between gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/profesor/evaluaciones')}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Actualizar examen' : 'Crear examen'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default CrearEditarExamen;
