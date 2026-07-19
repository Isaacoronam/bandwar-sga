import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import '../../styles/visor3d.css';

const resolveAssetPath = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

/**
 * Componente Model: Renderiza el modelo GLTF/GLB
 * @param {string} modelPath - Ruta al archivo .glb (ej: /assets/models/bombo.glb)
 */
function Model({ modelPath, onLoaded, onError }) {
  const group = useRef();
  const { scene, error } = useGLTF(modelPath);
  const [rotation, setRotation] = useState([0, 0, 0]);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Auto-rotación suave del modelo
  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.005;
    }
  });

  // Centrar y escalar el modelo automáticamente
  const sceneClone = scene.clone();
  const bbox = new THREE.Box3().setFromObject(sceneClone);
  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2 / maxDim;

  return (
    <group
      ref={group}
      position={[-center.x * scale, -center.y * scale, -center.z * scale]}
      scale={scale}
      onPointerEnter={() => onLoaded && onLoaded()}
    >
      <primitive object={sceneClone} />
    </group>
  );
}

/**
 * Loader personalizado: Mostrar mientras carga el modelo
 */
function Loader() {
  return (
    <div className="visor3d-loader">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Cargando modelo 3D...</span>
      </div>
      <p className="mt-3 text-muted">Cargando visualización 3D...</p>
    </div>
  );
}

/**
 * Componente Visor3D Principal
 * 
 * Uso:
 *   <Visor3D modelPath="/assets/models/bombo.glb" nombre="Bombo" />
 * 
 * Props:
 *   - modelPath (string): Ruta del archivo .glb
 *   - nombre (string): Nombre del instrumento (para UI)
 *   - altura (string): Altura del canvas (default: 500px)
 *   - onInteraction (function): Callback cuando usuario interactúa
 */
function Visor3D({ modelPath, nombre = 'Instrumento', altura = '500px', onInteraction }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canvasReady, setCanvasReady] = useState(true);
  const [stats, setStats] = useState({
    rotations: 0,
    zooms: 0,
    viewTime: 0,
  });
  const startTimeRef = useRef(Date.now());
  const orbitControlsRef = useRef();

  // Manejar errores de carga
  const handleError = (err) => {
    console.error('Error cargando modelo 3D:', err);
    setError(`Error al cargar el modelo: ${err.message}`);
    setLoading(false);
  };

  // Callback cuando el modelo carga exitosamente
  const handleLoaded = () => {
    setLoading(false);
    setError(null);
    setCanvasReady(true);
    console.log('Modelo 3D cargado exitosamente:', modelPath);
  };

  const handleCanvasContextLoss = (event) => {
    event.preventDefault();
    setCanvasReady(false);
    setError('El visor 3D perdió el contexto del navegador. Recarga la página para intentar nuevamente.');
  };

  // Actualizar estadísticas de interacción
  const updateStats = () => {
    if (onInteraction) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      onInteraction({
        tiempo_visualizacion_segundos: elapsed,
        rotaciones_realizadas: stats.rotations,
        zooms_realizados: stats.zooms,
      });
    }
  };

  // Verificar que la ruta del modelo sea válida
  if (!modelPath) {
    return (
      <div className="alert alert-warning">
        <i className="bi bi-exclamation-triangle me-2"></i>
        No se especificó ruta del modelo 3D
      </div>
    );
  }

  return (
    <div className="visor3d-container">
      <div className="visor3d-header">
        <h5 className="mb-0">
          <i className="bi bi-cube me-2"></i>
          {nombre}
        </h5>
        <small className="text-muted">{modelPath}</small>
      </div>

      <div className="visor3d-canvas" style={{ height: altura, position: 'relative' }}>
        {error && (
          <div className="alert alert-danger m-0 h-100 d-flex align-items-center justify-content-center">
            <div>
              <i className="bi bi-exclamation-circle me-2"></i>
              {error}
            </div>
          </div>
        )}

        {!error && canvasReady && (
          <Canvas
            camera={{ position: [0, 0, 5], fov: 50 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
            onCreated={({ camera, gl }) => {
              camera.aspect = window.innerWidth / window.innerHeight;
              camera.updateProjectionMatrix();
              gl.domElement.addEventListener('webglcontextlost', handleCanvasContextLoss);
            }}
          >
            {/* Iluminación */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -10, 10]} intensity={0.5} />

            {/* Modelo 3D */}
            <Suspense fallback={<Loader />}>
              <Model modelPath={modelPath} onLoaded={handleLoaded} onError={handleError} />
            </Suspense>

            {/* Controles orbitales */}
            <OrbitControls
              ref={orbitControlsRef}
              autoRotate={loading}
              autoRotateSpeed={4}
              enableZoom={true}
              enablePan={true}
              enableRotate={true}
              onStart={() => {
                stats.rotations += 1;
                updateStats();
              }}
            />

          </Canvas>
        )}
      </div>

      <div className="visor3d-footer">
        <div className="visor3d-stats">
          <small className="text-muted">
            <i className="bi bi-clock me-1"></i>
            <span id="view-time">0</span>s
            <span className="mx-2">•</span>
            <i className="bi bi-arrow-clockwise me-1"></i>
            {stats.rotations} rotaciones
            <span className="mx-2">•</span>
            <i className="bi bi-zoom-in me-1"></i>
            {stats.zooms} zooms
          </small>
        </div>
        <div className="visor3d-hint">
          <small className="text-muted">
            💡 <strong>Controles:</strong> Click derecho para rotar • Rueda para zoom • Click izq + arrastra para panorámica
          </small>
        </div>
      </div>
    </div>
  );
}

export default Visor3D;

// Precargar modelo de forma segura
useGLTF.preload = (modelPath) => {
  try {
    useGLTF.preload(modelPath);
  } catch (err) {
    console.warn('No se pudo precargar modelo:', modelPath, err);
  }
};
