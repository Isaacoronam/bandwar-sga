import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAuth } from '../../context/AuthContext';
import InstrumentoModel from '../../components/3d/InstrumentoModel';
import CanvasErrorBoundary from '../../components/ErrorBoundary';
import '../../styles/visor3d.css';

const BACKGROUND_URL = new URL('../../assets/img/unefa_patio.jpg', import.meta.url).href;

const MODEL_MAP = {
  bombo: '/assets/models/bombo.glb',
  trompeta: '/assets/models/trompeta.glb',
  granaderos: '/assets/models/granaderos.glb',
  lira: '/assets/models/lira.glb',
  platillos: '/assets/models/platillos.glb',
  redoblante: '/assets/models/redoblante.glb',
  tambor_mayor: '/assets/models/tambor_mayor.glb',
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
    <div className="visor-immersive-container" style={{ backgroundImage: `url(${BACKGROUND_URL})` }}>
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
                  <Canvas
                    camera={{ position: [0, 0, 5], fov: 60 }}
                    gl={{ alpha: true }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <ambientLight intensity={0.75} />
                    <directionalLight position={[5, 8, 2]} intensity={1.2} />
                    <directionalLight position={[-5, 3, -4]} intensity={0.45} />
                    <spotLight position={[0, 8, 8]} intensity={0.8} angle={0.25} penumbra={0.5} />

                    <Suspense fallback={<div className="canvas-loading">Cargando modelo 3D…</div>}>
                      <InstrumentoModel modelPath={effectiveModelPath} />
                    </Suspense>

                    <OrbitControls enableZoom enablePan enableRotate />
                  </Canvas>
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
