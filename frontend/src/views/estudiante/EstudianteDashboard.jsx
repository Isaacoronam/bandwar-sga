import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import InstrumentoModel from '../../components/3d/InstrumentoModel';
import CanvasErrorBoundary from '../../components/ErrorBoundary';
import './EstudianteDashboard.css';

const resolveAssetPath = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

const MODEL_MAP = {
  platillos: resolveAssetPath('/assets/models/platillos.glb'),
  trompeta: resolveAssetPath('/assets/models/trompeta.glb'),
  granaderos: resolveAssetPath('/assets/models/granaderos.glb'),
  lira: resolveAssetPath('/assets/models/lira.glb'),
  bombo: resolveAssetPath('/assets/models/bombo.glb'),
  tambor_mayor: resolveAssetPath('/assets/models/tambor_mayor.glb'),
  redoblante: resolveAssetPath('/assets/models/redoblante.glb'),
};

const INSTRUMENT_INFO = {
  platillos: {
    descripcion: 'Platillos de guerra oficiales con posiciones de choque y sincronía en formaciones cerradas.',
    mantenimiento: 'Secar y revisar los bordes después de cada práctica para garantizar integridad sonora.',
    dato: 'Los platillos UNEFA acompañan los pasos marciales en actos ceremoniales de alto protocolo.',
  },
  trompeta: {
    descripcion: 'Trompeta institucional para señales, fanfarrias y cambios de formación en la banda.',
    mantenimiento: 'Limpiar el interior del tubo y engrasar válvulas frecuentemente.',
    dato: 'Esta trompeta es usada para marcar el inicio de las marchas oficiales de la UNEFA.',
  },
  granaderos: {
    descripcion: 'Granaderos en correcta formación para escolta y protección institucional.',
    mantenimiento: 'Verificar postura, uniformidad y posición durante los ensayos.',
    dato: 'El cuerpo de granaderos simboliza disciplina y presencia militar en UNEFA.',
  },
  lira: {
    descripcion: 'Lira de marcha para mantener el tempo y la precisión sonora en la banda.',
    mantenimiento: 'Ajustar las cuerdas y revisar la integridad estructural antes de cada uso.',
    dato: 'La lira UNEFA es un emblema sonoro en la banda de guerra institucional.',
  },
  bombo: {
    descripcion: 'Bombo marcial que da el pulso principal a las formaciones de paso.',
    mantenimiento: 'Comprobar tensión del parche y la condición de los bastones.',
    dato: 'El bombo UNEFA define el ritmo central de los desfiles y presentaciones militares.',
  },
  tambor_mayor: {
    descripcion: 'Tambor Mayor guía las órdenes y los cambios de dirección en la banda.',
    mantenimiento: 'Revisar baquetas y parche para un sonido claro y uniforme.',
    dato: 'El Tambor Mayor UNEFA es el mando visible de la formación de guerra.',
  },
  redoblante: {
    descripcion: 'Redoblante para acentos, contratiempos y maniobras de marchas rápidas.',
    mantenimiento: 'Ajustar la tensión y la afinación antes de cada presentación.',
    dato: 'El redoblante UNEFA aporta precisión rítmica en ceremonias y desfiles.',
  },
};

const DEFAULT_CONTENT = {
  descripcion: 'Instrumento asignado que forma parte de la banda de guerra institucional.',
  mantenimiento: 'Mantener el instrumento limpio y revisado según las directrices UNEFA.',
  dato: 'UNEFA exige estándares de presentación y alineación en cada formación de banda.',
};

function EstudianteDashboard() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [activeTab, setActiveTab] = useState('descripcion');

  const fullName = useMemo(
    () => `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim() || 'Nombre no disponible',
    [usuario]
  );

  const militaryRank = usuario?.rango_militar || usuario?.rango || 'Soldado';
  const cedula = usuario?.cedula || 'N/A';
  const carrera = usuario?.carrera || 'Carrera no registrada';
  const semestre = usuario?.semestre || 'N/A';
  
  // ✅ Usar los nuevos campos instructor_nombre e instructor_rango del payload de login
  const instructorName = usuario?.instructor_nombre || usuario?.profesor || usuario?.instructor || 'Instructor no asignado';
  const instructorRank = usuario?.instructor_rango || usuario?.profesor_rango || usuario?.rango_profesor || 'Teniente';
  
  const [evaluacionesPendientes, setEvaluacionesPendientes] = useState(0);
  const hasEvaluacionesPendientes = evaluacionesPendientes > 0;

  const assignedInstrument = useMemo(() => {
    if (!usuario) return null;
    if (usuario.instrumento_asignado) return usuario.instrumento_asignado;
    if (usuario.instrumento) return usuario.instrumento;
    if (usuario.instrumento_nombre || usuario.instrumentoName) {
      return { nombre: usuario.instrumento_nombre || usuario.instrumentoName };
    }
    return null;
  }, [usuario]);

  function normalizeToSnake(text) {
    if (!text) return '';
    return text
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  const instrumentKey = useMemo(() => {
    if (!assignedInstrument) return null;
    const raw = typeof assignedInstrument === 'string' ? assignedInstrument : assignedInstrument.nombre || '';
    const name = normalizeToSnake(raw);
    if (!name) return null;
    // exact or partial match
    return Object.keys(MODEL_MAP).find((key) => name.includes(key) || key.includes(name)) || null;
  }, [assignedInstrument]);

  const isFallbackInstrument = !instrumentKey || String(assignedInstrument).trim().toLowerCase() === 'no poseo';
  const finalInstrumentKey = isFallbackInstrument ? 'tambor_mayor' : instrumentKey;
  const modelUrl = useMemo(() => MODEL_MAP[finalInstrumentKey], [finalInstrumentKey]);
  const instrumentDisplayName = isFallbackInstrument
    ? 'Modo de Práctica: Tambor Mayor (Sin instrumento asignado)'
    : typeof assignedInstrument === 'string'
      ? assignedInstrument
      : assignedInstrument?.nombre || 'Instrumento asignado';

  useEffect(() => {
    const fetchEvaluacionesPendientes = async () => {
      try {
        const response = await api.get('/api/estudiante/examenes/');
        let examenes = [];

        if (Array.isArray(response.data)) {
          examenes = response.data;
        } else if (response.data?.results && Array.isArray(response.data.results)) {
          examenes = response.data.results;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          examenes = response.data.data;
        }

        const pendientes = examenes.filter((examen) => {
          if (!examen) return false;

          const estadoIntento = (examen.estado_intento || '').toString().trim();
          const yaCalificado = estadoIntento === 'Calificado';
          const yaEntregado = ['Entregado', 'Pendiente'].includes(estadoIntento);
          const ahora = new Date();
          const apertura = examen.fecha_apertura ? new Date(examen.fecha_apertura) : null;
          const cierre = examen.fecha_cierre ? new Date(examen.fecha_cierre) : null;
          const disponible = apertura && cierre ? ahora >= apertura && ahora <= cierre : false;

          return disponible && !yaCalificado && !yaEntregado;
        }).length;

        setEvaluacionesPendientes(pendientes);
      } catch (err) {
        console.error('Error cargando evaluaciones pendientes:', err);
        setEvaluacionesPendientes(0);
      }
    };

    fetchEvaluacionesPendientes();
  }, []);

  const instrumentContent = instrumentKey ? INSTRUMENT_INFO[instrumentKey] : DEFAULT_CONTENT;

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div
                  className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 72, height: 72 }}
                >
                  <i className="bi bi-person-circle fs-1" />
                </div>
                <div>
                  <h5 className="card-title mb-1">{fullName}</h5>
                  <span className="badge bg-warning text-dark fw-bold">{militaryRank}</span>
                </div>
              </div>

              <h6 className="text-uppercase fw-bold text-muted small mb-3">Información Académica</h6>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <span className="fw-semibold">Cédula:</span> <span className="text-secondary">{cedula}</span>
                </li>
                <li className="mb-2">
                  <span className="fw-semibold">Carrera:</span> <span className="text-secondary">{carrera}</span>
                </li>
                <li>
                  <span className="fw-semibold">Semestre:</span> <span className="text-secondary">{semestre}</span>
                </li>
              </ul>
              <button 
                type="button" 
                className="btn btn-outline-primary mt-4 shadow-sm"
                onClick={() => navigate('/perfil')}
              >
                Ajustes de Perfil
              </button>
              <button 
                type="button" 
                className="btn btn-outline-success mt-2 shadow-sm"
                onClick={() => navigate('/estudiante/notas')}
              >
                Mis Calificaciones
              </button>
            </div>
          </div>

          <div className="card shadow-sm border-0 bg-dark text-white">
            <div className="card-body">
              <h6 className="text-warning fw-bold text-uppercase mb-3">Instructor Encargado</h6>
              <p className="mb-1 fw-semibold">{instructorRank}</p>
              <p className="mb-3">{instructorName}</p>
              <p className="small text-secondary mb-0">UNEFA - Sede Coro</p>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <div className="card shadow-sm border-0 bg-primary text-white h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                      <small className="text-uppercase fw-bold opacity-75">Instrumento Asignado</small>
                      <h4 className="fw-bold mb-0">{instrumentDisplayName}</h4>
                    </div>
                    <div className="bg-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
                      <i className="bi bi-music-note-list text-primary fs-4" />
                    </div>
                  </div>
                  <p className="mb-0 opacity-75">Instrumento cargado directamente desde tu perfil de estudiante.</p>
                  {isFallbackInstrument && (
                    <p className="mb-0 text-warning small">Modo de Práctica activo: se muestra el tambor mayor por defecto.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className={`card shadow-sm border-0 h-100 ${
                hasEvaluacionesPendientes ? 'bg-success' : 'bg-secondary'
              } text-white`}>
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                      <small className="text-uppercase fw-bold opacity-75">Tareas del Profesor</small>
                      <h4 className="fw-bold mb-0">
                        {hasEvaluacionesPendientes
                          ? `${evaluacionesPendientes} ${evaluacionesPendientes === 1 ? 'examen' : 'exámenes'} nuevo${evaluacionesPendientes === 1 ? '' : 'es'}`
                          : 'No asignadas'}
                      </h4>
                    </div>
                    <div className="bg-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
                      <i className={`bi ${hasEvaluacionesPendientes ? 'bi-exclamation-circle' : 'bi-check2-circle'} ${hasEvaluacionesPendientes ? 'text-warning' : 'text-success'} fs-4`} />
                    </div>
                  </div>
                  <p className="mb-0 opacity-75">
                    {hasEvaluacionesPendientes
                      ? `Tienes ${evaluacionesPendientes} examen${evaluacionesPendientes === 1 ? '' : 'es'} nuevo${evaluacionesPendientes === 1 ? '' : 's'}. Ve a Mis Evaluaciones para responderlo.`
                      : 'No hay exámenes pendientes. Buen trabajo.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-0">
              <div className="p-4 border-bottom">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="fw-bold mb-1">Visualizador Bandwar 3D</h5>
                    <p className="text-muted mb-0 small">Carga automática del instrumento según el perfil del estudiante.</p>
                  </div>
                </div>
              </div>
              <div className="viewer-frame" style={{ minHeight: 460 }}>
                {modelUrl ? (
                  <CanvasErrorBoundary>
                    <Canvas
                      camera={{ position: [0, 0, 4.5], fov: 58 }}
                      dpr={[1, 1.5]}
                      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false, powerPreference: 'low-power' }}
                      style={{ width: '100%', height: '100%' }}
                      onCreated={({ gl }) => {
                        gl.domElement.addEventListener('webglcontextlost', (event) => {
                          event.preventDefault();
                          console.warn('WebGL context lost; falling back to static UI.');
                        });
                      }}
                    >
                      <ambientLight intensity={0.75} />
                      <directionalLight position={[4, 6, 4]} intensity={1} />
                      <directionalLight position={[-4, 2, -3]} intensity={0.35} />
                      <Suspense fallback={null}>
                        <InstrumentoModel modelPath={modelUrl} />
                      </Suspense>
                      <OrbitControls enablePan enableRotate enableZoom />
                    </Canvas>
                  </CanvasErrorBoundary>
                ) : (
                  <div className="h-100 d-flex align-items-center justify-content-center bg-secondary bg-opacity-10">
                    <div className="text-center px-4">
                      <p className="fw-bold mb-2">Sin instrumento disponible</p>
                      <p className="mb-0 text-muted">Asegúrate de que tu perfil tenga un instrumento asignado para ver el visor 3D.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 border-top bg-light">
                <small className="text-muted">Usa el mouse para rotar y la rueda para hacer zoom.</small>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body">
              <ul className="nav nav-tabs nav-fill mb-4" role="tablist">
                {Object.keys(DEFAULT_CONTENT).map((tab) => (
                  <li className="nav-item" key={tab} role="presentation">
                    <button
                      className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                      type="button"
                      role="tab"
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'descripcion' ? 'Descripción' : tab === 'mantenimiento' ? 'Mantenimiento' : 'Dato UNEFA'}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="tab-content">
                <div className="tab-pane fade show active" role="tabpanel">
                  <h6 className="fw-bold mb-3">
                    {activeTab === 'descripcion'
                      ? 'Descripción'
                      : activeTab === 'mantenimiento'
                      ? 'Mantenimiento'
                      : 'Dato UNEFA'}
                  </h6>
                  <p className="text-secondary mb-0">{instrumentContent[activeTab]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EstudianteDashboard;
