
/**
 * ModalEnDesarrollo - Componente reutilizable para bloquear secciones no implementadas
 * @param {boolean} show - Controla la visibilidad del modal
 * @param {function} onClose - Función para cerrar el modal
 */
function ModalEnDesarrollo({ show, onClose }) {
  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title fw-bold">
              <i className="bi bi-tools me-2"></i>Módulo en Producción
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose} 
              aria-label="Cerrar"
            ></button>
          </div>
          <div className="modal-body py-4 text-center">
            <i className="bi bi-cone-striped display-1 text-warning mb-3"></i>
            <h5 className="fw-bold">Sección en Construcción</h5>
            <p className="text-muted">
              Esta característica está siendo desarrollada por el equipo de ingeniería y estará disponible en la próxima actualización del sistema.
            </p>
          </div>
          <div className="modal-footer bg-light border-top-0 justify-content-center">
            <button type="button" className="btn btn-dark px-4" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalEnDesarrollo;