import React from 'react';

class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[3D CANVAS ERROR]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="canvas-error p-3 text-center bg-light border rounded-3" style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>
            <h5 className="mb-2">Visor 3D no disponible</h5>
            <p className="text-muted small mb-0">
              El navegador perdió el contexto WebGL. Puedes recargar la vista o continuar con la información textual del instrumento.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CanvasErrorBoundary;
