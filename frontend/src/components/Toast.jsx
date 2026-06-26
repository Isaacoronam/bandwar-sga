import { useEffect } from 'react';

/**
 * Componente Toast para notificaciones
 * 
 * Props:
 *   - visible (boolean): Mostrar/ocultar toast
 *   - message (string): Mensaje a mostrar
 *   - type (string): 'success' | 'error' | 'warning' | 'info'
 *   - duration (number): Milisegundos antes de cerrar (default: 3000)
 *   - onClose (function): Callback cuando se cierra
 */
function Toast({ visible, message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onClose && onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  const typeClasses = {
    success: 'bg-success',
    error: 'bg-danger',
    warning: 'bg-warning',
    info: 'bg-info',
  };

  const icons = {
    success: 'bi-check-circle',
    error: 'bi-exclamation-circle',
    warning: 'bi-exclamation-triangle',
    info: 'bi-info-circle',
  };

  return (
    <div
      className={`position-fixed end-0 bottom-0 p-3`}
      style={{ zIndex: 9999 }}
    >
      <div
        className={`toast ${typeClasses[type]} text-white border-0 shadow-lg`}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={{
          animation: 'slideInRight 0.3s ease-out',
          minWidth: '300px',
        }}
      >
        <div className="toast-body d-flex align-items-center gap-2">
          <i className={`bi ${icons[type]}`}></i>
          <span>{message}</span>
          <button
            type="button"
            className="btn-close btn-close-white ms-auto"
            aria-label="Close"
            onClick={() => onClose && onClose()}
          ></button>
        </div>
      </div>
    </div>
  );
}

export default Toast;

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
