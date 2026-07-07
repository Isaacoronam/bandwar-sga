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

function MisEvaluaciones() {
  const { token, usuario } = useAuth();
  const navigate = useNavigate();
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    const fetchEvaluaciones = async () => {
      setLoading(true);
      setError(null);
      setDebugInfo(null);

      try {
        // 🔍 VALIDACIÓN 1: Token presente
        if (!token) {
          console.error('❌ [VALIDACIÓN] No hay token JWT disponible');
          setError('Sesión no válida. Por favor inicia sesión nuevamente.');
          setLoading(false);
          return;
        }

        // 🔍 VALIDACIÓN 2: Usuario logueado
        if (!usuario) {
          console.error('❌ [VALIDACIÓN] Usuario no disponible en contexto');
          setError('Usuario no identificado. Por favor inicia sesión nuevamente.');
          setLoading(false);
          return;
        }

        // 🔍 VALIDACIÓN 3: CRÍTICO - Instructor asignado
        const hasInstructor = usuario.instructor_encargado && usuario.instructor_encargado.id;
        if (!hasInstructor) {
          console.warn(
            '⚠️  [VALIDACIÓN] Usuario estudiante SIN instructor_encargado asignado',
            {
              usuario_cedula: usuario.cedula,
              usuario_rol: usuario.rol,
              instructor_encargado: usuario.instructor_encargado,
            }
          );

          setDebugInfo({
            tipo: 'ADVERTENCIA_CRÍTICA',
            titulo: 'Estudiante sin Instructor Asignado',
            mensaje: `Tu cuenta (${usuario.cedula}) no tiene un instructor asignado. 
                      Contacta al administrador o a tu profesor para que te registre correctamente.`,
            usuario_cedula: usuario.cedula,
            instructor_id: usuario.instructor_encargado?.id || 'NONE',
            instructor_nombre: usuario.instructor_nombre || 'No asignado',
          });

          console.log('📋 Debug Info:', {
            usuario_cedula: usuario.cedula,
            usuario_nombre: usuario.nombre,
            usuario_apellido: usuario.apellido,
            instructor_encargado: usuario.instructor_encargado,
            instructor_id: usuario.instructor_encargado?.id,
            instructor_nombre: usuario.instructor_nombre,
          });

          setError(
            '⚠️  No tienes instructor asignado. Por favor, contacta a tu profesor para registrarte correctamente.'
          );
          setLoading(false);
          return;
        }

        // 🔍 VALIDACIÓN 4: Headers JWT
        console.log('📤 [REQUEST] Enviando petición a /api/estudiante/examenes/', {
          headers: {
            authorization: `Bearer ${token.substring(0, 20)}...` // Sin exponer el token completo
          },
          usuario_cedula: usuario.cedula,
          instructor_asignado: {
            id: usuario.instructor_encargado.id,
            cedula: usuario.instructor_encargado.cedula,
            nombre: usuario.instructor_nombre,
          }
        });

        // 🚀 PETICIÓN AL BACKEND
        const response = await api.get('/api/estudiante/examenes/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('✅ [RESPONSE] Exámenes obtenidos:', {
          status: response.status,
          data_type: typeof response.data,
          is_array: Array.isArray(response.data),
          count: Array.isArray(response.data) ? response.data.length : (response.data?.results?.length || 0),
          payload_sample: response.data?.results?.[0] || response.data?.[0] || 'N/A',
        });

        // 🔍 VALIDACIÓN 5: Manejo de respuesta paginada o array plano
        let examenes = [];

        if (Array.isArray(response.data)) {
          // Respuesta es un array directo
          examenes = response.data;
          console.log('✅ Respuesta como array directo:', examenes.length, 'exámenes');
        } else if (response.data && typeof response.data === 'object') {
          // Respuesta podría ser paginada { results: [...] } o { data: [...] }
          if (response.data.results && Array.isArray(response.data.results)) {
            examenes = response.data.results;
            console.log('✅ Respuesta paginada (results):', examenes.length, 'exámenes');
          } else if (response.data.data && Array.isArray(response.data.data)) {
            examenes = response.data.data;
            console.log('✅ Respuesta con estructura data:', examenes.length, 'exámenes');
          } else {
            console.warn('⚠️  Estructura de respuesta no reconocida:', response.data);
            examenes = [];
          }
        } else {
          console.error('❌ Tipo de respuesta inesperado:', typeof response.data);
          examenes = [];
        }

        setEvaluaciones(examenes);

        if (examenes.length === 0) {
          console.warn('ℹ️  No hay exámenes disponibles en este momento');
        }

      } catch (err) {
        console.error('❌ [ERROR] Fallo al obtener exámenes:', {
          error_type: err.response?.status || 'NETWORK_ERROR',
          status_code: err.response?.status,
          status_text: err.response?.statusText,
          error_message: err.response?.data?.detail || err.message,
          full_response: err.response?.data,
        });

        // 🔍 DIAGNÓSTICO POR TIPO DE ERROR
        let mensajeError = null;

        if (err.response?.status === 403) {
          mensajeError =
            'Acceso denegado. No tienes permisos para ver exámenes. ' +
            'Verifica que tu rol sea ESTUDIANTE y tengas un instructor asignado.';
          console.error('🔴 [DIAGNÓSTICO 403]:', {
            usuario_rol: usuario.rol,
            instructor_id: usuario.instructor_encargado?.id,
            token_presente: !!token,
            possible_causes: [
              '1. No eres un estudiante válido',
              '2. Tu instructor_encargado es NULL o inválido',
              '3. El token expiró o no es válido',
            ],
          });
        } else if (err.response?.status === 401) {
          mensajeError = 'Sesión expirada. Por favor inicia sesión nuevamente.';
          console.error('🔴 [DIAGNÓSTICO 401]: Token inválido o expirado');
        } else if (err.response?.status === 404) {
          mensajeError = 'Endpoint no encontrado. Verifica la configuración del servidor.';
          console.error('🔴 [DIAGNÓSTICO 404]: Ruta /api/estudiante/examenes/ no existe');
        } else if (!err.response) {
          // Error de red
          mensajeError =
            'Error de conexión. No se puede conectar al servidor. ' +
            'Verifica tu conexión a internet o que el servidor esté disponible.';
          console.error('🔴 [DIAGNÓSTICO RED]:', {
            mensaje: err.message,
            posibles_causas: [
              '1. Servidor no disponible (backend caído)',
              '2. Sin conexión a internet',
              '3. CORS bloqueado',
              '4. Timeout de conexión',
            ],
          });
        } else {
          mensajeError =
            `Error del servidor (HTTP ${err.response?.status}): ${err.response?.data?.detail || err.message}`;
        }

        setError(mensajeError);
        setDebugInfo({
          tipo: 'ERROR_HTTP',
          status: err.response?.status,
          message: err.message,
          usuario_cedula: usuario.cedula,
          instructor_id: usuario.instructor_encargado?.id,
          token_presente: !!token,
        });

      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchEvaluaciones();
    }
  }, [token, usuario, navigate]);

  const handleCardAction = (examen) => {
    if (!examen || !examen.id) {
      console.error('❌ Examen inválido:', examen);
      return;
    }
    const targetRoute =
      examen.estado_intento === 'Calificado' ? 'revisar' : 'tomar';
    console.log(`📍 Navegando a: /estudiante/evaluaciones/${examen.id}/${targetRoute}`);
    navigate(`/estudiante/evaluaciones/${examen.id}/${targetRoute}`);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando evaluaciones...</span>
        </div>
        <p className="text-muted mt-3">Conectando con el servidor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger mt-4" role="alert">
          <h5>❌ {error.split('.')[0]}</h5>
          <p className="mb-0 mt-2">{error}</p>
        </div>

        {debugInfo && debugInfo.tipo === 'ADVERTENCIA_CRÍTICA' && (
          <div className="alert alert-warning mt-3" role="alert">
            <h6>🔧 Información de Diagnóstico</h6>
            <ul className="mb-0">
              <li>
                <strong>Cédula:</strong> {debugInfo.usuario_cedula}
              </li>
              <li>
                <strong>ID del Instructor:</strong> {debugInfo.instructor_id}
              </li>
              <li>
                <strong>Nombre del Instructor:</strong> {debugInfo.instructor_nombre}
              </li>
              <li>
                <strong>Acción:</strong> Solicita a tu profesor que te registre nuevamente
                desde su panel de "Gestión de Estudiantes"
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Mis Evaluaciones</h2>
          <p className="text-muted">
            {usuario?.instructor_nombre && `Profesor: ${usuario.instructor_nombre}`}
          </p>
          <p className="text-muted small">
            Revisa aquí las pruebas disponibles y el estado de cada una.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {evaluaciones.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-secondary">
              ℹ️ No hay evaluaciones disponibles en este momento.
              {usuario?.instructor_encargado && (
                <p className="mb-0 mt-2 small">
                  Tu profesor ({usuario.instructor_nombre}) aún no ha publicado
                  exámenes. Revisa más tarde.
                </p>
              )}
            </div>
          </div>
        ) : (
          evaluaciones.map((examen) => {
            if (!examen || !examen.id) {
              console.warn('⚠️  Examen inválido encontrado:', examen);
              return null;
            }

            const ahora = new Date();
            const apertura = examen.fecha_apertura
              ? new Date(examen.fecha_apertura)
              : null;
            const cierre = examen.fecha_cierre
              ? new Date(examen.fecha_cierre)
              : null;
            const disponible =
              apertura && cierre && ahora >= apertura && ahora <= cierre;
            const estadoIntento = examen.estado_intento?.toString().trim() || '';
            const isCalificado = estadoIntento === 'Calificado';
            const isEntregado = ['Entregado', 'Pendiente'].includes(
              estadoIntento
            );
            const badgeClass = isCalificado
              ? 'bg-warning text-dark'
              : disponible
                ? 'bg-success'
                : 'bg-danger';
            const badgeLabel = isCalificado
              ? 'Calificado'
              : disponible
                ? 'Publicado'
                : isEntregado
                  ? 'Entregado'
                  : 'Cerrado';
            const buttonLabel = isCalificado
              ? 'Revisar Examen'
              : isEntregado
                ? 'Entregado, pendiente de calificación'
                : disponible
                  ? 'Responder'
                  : 'No Disponible';
            const buttonClass = isCalificado
              ? 'btn btn-warning text-dark'
              : isEntregado
                ? 'btn btn-secondary'
                : 'btn btn-primary';
            const buttonDisabled =
              (!disponible && !isCalificado) || isEntregado;

            return (
              <div className="col-md-6 col-lg-4" key={examen.id}>
                <div className="card h-100 shadow-sm">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="card-title">
                          {examen.titulo || 'Sin Título'}
                        </h5>
                        <p className="card-text text-muted mb-1">
                          Fecha límite
                        </p>
                        <p className="mb-0 fw-semibold">
                          {formatDateTime(examen.fecha_cierre)}
                        </p>
                      </div>
                      <span
                        className={`badge ${badgeClass} py-2 px-3`}
                      >
                        {badgeLabel}
                      </span>
                    </div>

                    <p className="text-muted flex-grow-1">
                      {examen.descripcion ||
                        'Esta evaluación forma parte del módulo académico.'}
                    </p>

                    {examen.calificacion_final && (
                      <p className="mb-3 text-success fw-semibold">
                        Calificación: {examen.calificacion_final}
                      </p>
                    )}

                    {isEntregado && (
                      <p className="mb-3 text-muted">
                        Tu intento ha sido entregado y está pendiente de
                        revisión.
                      </p>
                    )}

                    <div className="mt-3 d-grid gap-2">
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => handleCardAction(examen)}
                        disabled={buttonDisabled}
                      >
                        {buttonLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MisEvaluaciones;
