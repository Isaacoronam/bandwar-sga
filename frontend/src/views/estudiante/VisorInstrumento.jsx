import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAuth } from '../../context/AuthContext';
import InstrumentoModel from '../../components/3d/InstrumentoModel';
import CanvasErrorBoundary from '../../components/ErrorBoundary';
import backgroundImage from '../../assets/img/unefa_patio.jpg';
import '../../styles/visor3d.css';

const resolveAssetPath = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

const MODEL_MAP = {
  bombo: resolveAssetPath('/assets/models/bombo.glb'),
  trompeta: resolveAssetPath('/assets/models/trompeta.glb'),
  granaderos: resolveAssetPath('/assets/models/granaderos.glb'),
  lira: resolveAssetPath('/assets/models/lira.glb'),
  platillos: resolveAssetPath('/assets/models/platillos.glb'),
  redoblante: resolveAssetPath('/assets/models/redoblante.glb'),
  tambor_mayor: resolveAssetPath('/assets/models/tambor_mayor.glb'),
};

const FALLBACK_INSTRUMENT_LABEL = 'Modo de Práctica: Tambor Mayor (Sin instrumento asignado)';
const FALLBACK_MODEL_PATH = MODEL_MAP.tambor_mayor;

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

function getModelUrl(instrumentoOrName) {
  const nombreRaw = typeof instrumentoOrName === 'string' ? instrumentoOrName : instrumentoOrName?.nombre;
  const nombre = normalizeToSnake(nombreRaw || '');

  if (nombre && MODEL_MAP[nombre]) return MODEL_MAP[nombre];

  const key = Object.keys(MODEL_MAP).find((clave) => (nombreRaw || '').toLowerCase().includes(clave.replace(/_/g, '')));
  return key ? MODEL_MAP[key] : null;
}

export default function VisorInstrumento() {
  const { usuario } = useAuth() || {};

  const perfilInstrumento = usuario?.instrumento_asignado || null;
  const modelPath = perfilInstrumento ? getModelUrl(perfilInstrumento) : null;
  const isFallbackInstrument = !modelPath || !perfilInstrumento || String(perfilInstrumento).trim().toLowerCase() === 'no poseo';
  const effectiveModelPath = isFallbackInstrument ? FALLBACK_MODEL_PATH : modelPath;

  const instrumentLabel = useMemo(() => (isFallbackInstrument ? FALLBACK_INSTRUMENT_LABEL : perfilInstrumento), [isFallbackInstrument, perfilInstrumento]);

  return (
    <div className="visor-immersive-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="visor-immersive-overlay" />

      <div className="visor-immersive-content">
        <header className="visor-immersive-header">
          <div>
            <span className="visor-immersive-tag">Visor Estudiantil</span>
            <h1>Instrumento asignado</h1>
            <p>Este visor muestra únicamente el modelo 3D del instrumento que tu instructor te asignó.</p>
          </div>

          <div className="visor-immersive-meta">
            <span className="badge bg-gold">Solo lectura</span>
          </div>
        </header>

        <div className="visor-immersive-frame">
          <section className="canvas-panel">
            <div className="canvas-wrapper" role="img" aria-label={`Visor 3D - ${instrumentLabel}`}>
              {effectiveModelPath ? (
                <CanvasErrorBoundary>
                  <CanvasContent modelPath={effectiveModelPath} />
                </CanvasErrorBoundary>
              ) : (
                <div className="canvas-no-model">
                  <p>No hay un modelo 3D asignado para este usuario.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="visor-immersive-panel" aria-live="polite">
            <div className="panel-card">
              <div className="panel-head">
                <h2>{instrumentLabel}</h2>
                <p className="text-muted">Tu instrumento asignado por el profesor.</p>
              </div>

              <div className="instrument-detail">
                <p>
                  <strong>Instrumento asignado:</strong> {instrumentLabel}
                </p>
                <p>
                  <strong>Rol:</strong> Estudiante consultivo y operativo
                </p>
                <p className="text-muted">
                  No puedes agregar, editar ni eliminar este instrumento. Solo puedes visualizarlo y revisar tu progreso técnico.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CanvasContent({ modelPath }) {
  const [glLost, setGlLost] = useState(false);

  const handleCreated = ({ gl }) => {
    const onLost = (event) => {
      try {
        event.preventDefault();
      } catch (e) {
        // ignore
      }
      console.warn('WebGL context lost; falling back to static UI.');
      setGlLost(true);
    };

    const onRestored = () => {
      console.info('WebGL context restored; attempting to re-enable canvas.');
      setGlLost(false);
    };

    gl.domElement.addEventListener('webglcontextlost', onLost);
    gl.domElement.addEventListener('webglcontextrestored', onRestored);
  };

  if (glLost) {
    return (
      <div className="canvas-error p-3 text-center bg-light border rounded-3" style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>
          <h5 className="mb-2">Visor 3D no disponible</h5>
          <p className="text-muted small mb-0">El navegador perdió el contexto WebGL. Puedes recargar la vista o continuar con la información textual del instrumento.</p>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%' }}
      onCreated={handleCreated}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 8, 2]} intensity={1.2} />
      <directionalLight position={[-5, 3, -4]} intensity={0.45} />
      <spotLight position={[0, 8, 8]} intensity={0.8} angle={0.25} penumbra={0.5} />

      <Suspense fallback={<div className="canvas-loading">Cargando modelo 3D…</div>}>
        <InstrumentoModel modelPath={modelPath} />
      </Suspense>

      <OrbitControls enableZoom enablePan enableRotate />
    </Canvas>
  );
}
