import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const INSTRUMENTOS = [
  {
    key: 'platillos',
    label: 'Platillos',
    historia: 'Instrumento utilizado en señalizaciones y golpes ceremoniales durante la marcha.',
    aporte: 'Aporta carácter sonoro y solemnidad al ritmo de la banda.',
    funcion: 'Marca cortes y transiciones en los movimientos de orden cerrado.',
    cadencia: '4 tiempos de preparación antes de iniciar el movimiento.',
  },
  {
    key: 'trompeta',
    label: 'Trompeta',
    historia: 'Suele llevar las fanfarrias oficiales en las formaciones institutcionales.',
    aporte: 'Coordina los cambios de marcha y las señales de avance.',
    funcion: 'Dirige el inicio de la marcha y los cambios de paso.',
    cadencia: '4 tiempos estándar con énfasis en el pulso inicial.',
  },
  {
    key: 'granaderos',
    label: 'Granaderos',
    historia: 'Cuerpo de escolta y despliegue en formación cerrada para actos oficiales.',
    aporte: 'Asegura disciplina y presencia en el campo de maniobras.',
    funcion: 'Ejecuta el desplazamiento en orden cerrado y las formaciones de seguridad.',
    cadencia: 'Paso uniforme de 120 BPM en desplazamientos laterales y frontales.',
  },
  {
    key: 'lira',
    label: 'Lira',
    historia: 'Instrumento tradicional de la banda de guerra UNEFA con fuerte carga simbólica.',
    aporte: 'Mantiene el tempo y la armonía de la formación musical.',
    funcion: 'Soporta el pulso y la sincronía durante la marcha.',
    cadencia: '4 tiempos de apoyo con coordinación visual al líder.',
  },
  {
    key: 'bombo',
    label: 'Bombo',
    historia: 'Marca el pulso principal de los pasos en la formación militar.',
    aporte: 'Fija el ritmo base para la marcha y la disciplina de los movimientos.',
    funcion: 'Guía a la tropa en los cambios de paso y en la sincronización.',
    cadencia: 'Golpe inicial fuerte seguido de 3 golpes secundarios suaves.',
  },
  {
    key: 'tambor_mayor',
    label: 'Tambor Mayor',
    historia: 'Dirige el desfile con sus señales y bate las órdenes de la banda.',
    aporte: 'Comunica órdenes y cambios de formación con claridad.',
    funcion: 'Controla los relevos y la dirección de la marcha.',
    cadencia: '6 golpes de señalización para cada fase del movimiento.',
  },
  {
    key: 'redoblante',
    label: 'Redoblante',
    historia: 'Instrumento rítmico que acentúa la energía y la precisión del desfile.',
    aporte: 'Proporciona texturas rítmicas y ayuda a mantener la cadencia.',
    funcion: 'Ejecuta redobles y acentos en puntos clave de la maniobra.',
    cadencia: 'Muestra patrones de 4/4 con acentos en el segundo y cuarto tiempo.',
  },
];

const FRAMES = [
  { file: (instrumento) => `${instrumento}.jpeg`, label: 'Instrumento' },
  { file: (instrumento) => `atencion_${instrumento}.jpeg`, label: '¡Atención!' },
  { file: (instrumento) => `descanso_${instrumento}.jpeg`, label: 'A Discreción' },
  { file: (instrumento) => `preparado_${instrumento}.jpeg`, label: 'Prevenidos' },
  { file: (instrumento) => `marcha_${instrumento}.jpeg`, label: 'En Marcha' },
  { file: (instrumento) => `alto_${instrumento}.jpeg`, label: '¡Alto!' },
];

function OrdenCerrado() {
  const { usuario } = useAuth();
  const assignedInstrument = useMemo(() => {
    const raw = usuario?.instrumento_asignado || usuario?.instrumento || usuario?.instrumento_nombre || usuario?.instrumentoName || '';
    const normalized = String(raw).toLowerCase();
    return INSTRUMENTOS.find((item) => normalized.includes(item.key))?.key || INSTRUMENTOS[0].key;
  }, [usuario]);

  const [selectedInstrument, setSelectedInstrument] = useState(assignedInstrument);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    setSelectedInstrument(assignedInstrument);
    setFrameIndex(0);
    setIsAnimating(false);
  }, [assignedInstrument]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        window.clearInterval(animationRef.current);
      }
    };
  }, []);

  const imageMap = useMemo(() => {
    const modules = import.meta.glob('../../assets/img/orden_cerrado/*/*.{jpeg,jpg,png}', { eager: true, as: 'url' });
    return Object.entries(modules).reduce((acc, [path, url]) => {
      const normalizedPath = path.replace(/\\/g, '/');
      const match = normalizedPath.match(/orden_cerrado\/([^/]+)\/([^/]+)$/);
      if (!match) return acc;
      const [, instrumentKey, fileName] = match;
      const key = instrumentKey.toLowerCase();
      acc[key] = acc[key] || {};
      acc[key][fileName.toLowerCase()] = url;
      return acc;
    }, {});
  }, []);

  const selectedData = INSTRUMENTOS.find((item) => item.key === selectedInstrument) || INSTRUMENTOS[0];
  const selectedKey = selectedInstrument?.toLowerCase() || assignedInstrument;
  const currentFrame = FRAMES[frameIndex];
  const imageName = currentFrame.file(selectedKey).toLowerCase();
  const currentImage = imageMap[selectedKey]?.[imageName] || '';

  const handleSelectInstrument = (key) => {
    setSelectedInstrument(key);
    setFrameIndex(0);
    setIsAnimating(false);
    if (animationRef.current) {
      window.clearInterval(animationRef.current);
      animationRef.current = null;
    }
  };

  const handlePrev = () => {
    setFrameIndex((prev) => (prev === 0 ? FRAMES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setFrameIndex((prev) => (prev === FRAMES.length - 1 ? 0 : prev + 1));
  };

  const handleSimular = () => {
    if (isAnimating) return;
    setFrameIndex(0);
    setIsAnimating(true);
    animationRef.current = window.setInterval(() => {
      setFrameIndex((prev) => {
        if (prev >= FRAMES.length - 1) {
          if (animationRef.current) {
            window.clearInterval(animationRef.current);
            animationRef.current = null;
          }
          setIsAnimating(false);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
  };

  return (
    <div className="container-fluid py-4">
      <div className="row gy-4">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
            <div>
              <h1 className="h3 mb-2">Orden Cerrado UNEFA</h1>
              <p className="text-muted mb-0">Explora las posiciones reglamentarias por instrumento y simula los movimientos oficiales.</p>
            </div>
            <div>
              <span className="badge bg-warning text-dark py-2 px-3">Módulo de Orden Cerrado</span>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">Instrumentos oficiales</h5>
              <div className="list-group">
                {INSTRUMENTOS.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={`list-group-item list-group-item-action ${selectedInstrument === item.key ? 'active' : ''}`}
                    onClick={() => handleSelectInstrument(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-9">
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <h2 className="h5 mb-1">{selectedData.label}</h2>
                      <span className="badge bg-dark">Manual de Instrucción de la Banda de Guerra</span>
                    </div>
                    <div className="text-end">
                      <small className="text-muted">Instrumento asignado</small>
                      <p className="mb-0 fw-semibold">{selectedData.label}</p>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <div className="p-3 rounded-3 border bg-white h-100">
                        <div className="d-flex align-items-center mb-2">
                          <i className="bi bi-book-half fs-4 text-warning me-2" />
                          <h6 className="mb-0">Reseña Histórica</h6>
                        </div>
                        <p className="text-muted small mb-0">{selectedData.historia}</p>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="p-3 rounded-3 border bg-white h-100">
                        <div className="d-flex align-items-center mb-2">
                          <i className="bi bi-lightning-charge-fill fs-4 text-warning me-2" />
                          <h6 className="mb-0">Aporte</h6>
                        </div>
                        <p className="text-muted small mb-0">{selectedData.aporte}</p>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="p-3 rounded-3 border bg-white h-100">
                        <div className="d-flex align-items-center mb-2">
                          <i className="bi bi-gear-fill fs-4 text-warning me-2" />
                          <h6 className="mb-0">Función</h6>
                        </div>
                        <p className="text-muted small mb-0">{selectedData.funcion}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title mb-3">Orden Cerrado y Técnica</h5>
                  <p className="text-muted mb-3">Cadencia reglamentaria por instrumento.</p>
                  <div className="p-3 rounded-3 bg-light border">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <i className="bi bi-clock-history fs-3 text-warning" />
                      <div>
                        <h6 className="mb-1">Cadencia oficial</h6>
                        <p className="mb-0 text-muted small">{selectedData.cadencia}</p>
                      </div>
                    </div>
                    <div className="ratio ratio-16x9 rounded-3 bg-white border p-3">
                      <div className="d-flex flex-column justify-content-center align-items-start">
                        <span className="text-uppercase text-warning fw-bold small">Cadencia reglamentaria</span>
                        <p className="display-6 fw-bold mb-1">{selectedData.cadencia}</p>
                        <p className="text-muted small">Sigue este patrón antes de iniciar la simulación del movimiento.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card shadow-sm h-100">
                <div className="card-body d-flex flex-column h-100">
                  <div className="mb-4">
                    <h5 className="card-title mb-1">Visor de posiciones</h5>
                    <p className="text-muted mb-0">Recorre los estados reglamentarios del instrumento seleccionado.</p>
                  </div>

                  <div className="bg-light border rounded-4 overflow-hidden mb-3" style={{ minHeight: 360 }}>
                    {currentImage ? (
                      <img src={currentImage} alt={currentFrame.label} className="img-fluid w-100 h-100 object-fit-cover" style={{ minHeight: 360 }} />
                    ) : (
                      <div className="h-100 d-flex align-items-center justify-content-center text-center p-4">
                        <div>
                          <p className="fw-bold text-muted mb-2">Imagen no disponible</p>
                          <p className="text-muted small">Asegúrate de que los archivos de imagen existan en la carpeta de recursos.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-warning small text-uppercase">Estado actual</span>
                    <h3 className="fw-bold text-dark">{currentFrame.label}</h3>
                  </div>

                  <div className="d-flex gap-2 mb-3">
                    <button type="button" className="btn btn-outline-secondary flex-fill" onClick={handlePrev}>
                      ◄ Anterior
                    </button>
                    <button type="button" className="btn btn-outline-secondary flex-fill" onClick={handleNext}>
                      Siguiente ►
                    </button>
                  </div>

                  <button type="button" className="btn btn-warning text-dark w-100" onClick={handleSimular} disabled={isAnimating}>
                    {isAnimating ? 'Simulación en curso...' : 'SIMULAR MOVIMIENTO'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrdenCerrado;
