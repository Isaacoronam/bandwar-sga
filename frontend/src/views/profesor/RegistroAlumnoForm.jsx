import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';

// Use centralized API client `api`

function RegistroAlumnoForm({ show, onClose, refreshListaAlumnos, onSuccessToast, estudiantes = [], alumnoParaEditar = null }) {
  const navigate = useNavigate();
  const { getRol } = useAuth();

  const editando = !!alumnoParaEditar;

  // Estados locales sincronizados con el backend de Django
  const [cedula, setCedula] = useState(editando ? (alumnoParaEditar.cedula || '') : '');
  const [cedulaError, setCedulaError] = useState('');
  const [nombre, setNombre] = useState(editando ? (alumnoParaEditar.nombre || alumnoParaEditar.first_name || '') : '');
  const [apellido, setApellido] = useState(editando ? (alumnoParaEditar.apellido || alumnoParaEditar.last_name || '') : '');
  const [email, setEmail] = useState(editando ? (alumnoParaEditar.email || '') : '');
  const [carrera, setCarrera] = useState(editando ? (alumnoParaEditar.carrera || '') : '');
  const [semestre, setSemestre] = useState(editando ? (alumnoParaEditar.semestre || '1') : '1');
  
  // Ajuste: Por defecto inicia en 'No poseo' en lugar de vacío
  const [rangoMilitar, setRangoMilitar] = useState(editando ? (alumnoParaEditar.rango_militar || 'No poseo') : 'No poseo');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const nombreRegex = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]*$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validación: cédula debe tener entre 6 y 8 dígitos
    const cedulaDigits = String(cedula).replace(/\D/g, '');
    if (cedulaDigits.length < 6 || cedulaDigits.length > 8) {
      setError('La cédula debe tener entre 6 y 8 dígitos');
      setCedulaError('La cédula debe tener entre 6 y 8 dígitos');
      return;
    }

    if (getRol() !== 'PROFESOR') {
      setError('Acceso denegado: no tiene permisos de profesor');
      return;
    }
    if (!cedula.trim() || !nombre.trim() || !apellido.trim() || !email.trim() || !carrera.trim()) {
      setError('Los datos básicos, el correo y la carrera son obligatorios');
      return;
    }

    if (!nombreRegex.test(nombre.trim())) {
      setError('El nombre solo puede contener letras y espacios');
      return;
    }
    if (!nombreRegex.test(apellido.trim())) {
      setError('El apellido solo puede contener letras y espacios');
      return;
    }

    if (!editando) {
      const exists = estudiantes.some((s) => String(s.cedula) === String(cedula).trim());
      if (exists) {
        setError('La cédula ya existe en el sistema');
        return;
      }
    }

    setLoading(true);
    try {

      // Estructura limpia que espera el RegistroAlumnoSerializer de Django
      const payload = {
        cedula: cedula.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        carrera: carrera.trim(),
        semestre: semestre,
        rango_militar: rangoMilitar.trim(),
        password: cedula.trim(), // Contraseña por defecto = cédula
      };

      const url = editando
        ? `/api/profesor/editar-alumno/${alumnoParaEditar.id}/`
        : `/api/profesor/registrar-alumno/`;

      const res = await (editando ? api.put(url, payload) : api.post(url, payload));

      if (res.status === 201 || res.status === 200) {
        if (refreshListaAlumnos) await refreshListaAlumnos();
        if (onClose) onClose();
        if (onSuccessToast) {
          onSuccessToast(editando ? 'Músico actualizado correctamente' : 'Nuevo músico inscrito correctamente');
        }
      } else if (res.status === 403) {
        navigate('/login');
      } else {
        const msg = res.data?.detail || res.data?.error || 'Error al procesar la solicitud';
        setError(msg);
      }
    } catch (err) {
      console.error('[ERROR] al procesar alumno:', err);
      setError('Error de red al intentar conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-dark text-warning py-3">
            <h5 className="modal-title fw-bold">
              {editando ? (
                <><i className="bi bi-pencil-square me-2"></i>Editar Estudiante</>
              ) : (
                <><i className="bi bi-person-plus-fill me-2"></i>Inscribir Nuevo Músico</>
              )}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={loading}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
                </div>
              )}

              <h6 className="text-primary border-bottom pb-2 mb-3">Datos Básicos (Obligatorios)</h6>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="nombre" className="form-label fw-bold">Nombre</label>
                  <input id="nombre" className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="apellido" className="form-label fw-bold">Apellido</label>
                  <input id="apellido" className="form-control" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="email" className="form-label fw-bold">Correo Electrónico</label>
                <input 
                  id="email" 
                  type="email"
                  className="form-control" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="ejemplo@unefa.edu.ve"
                  required 
                />
              </div>

              <div className="mb-3">
                <label htmlFor="cedula" className="form-label fw-bold">Cédula</label>
                <div className="input-group">
                  <span className="input-group-text bg-secondary text-white fw-bold">V-</span>
                  <input
                    id="cedula"
                    className={`form-control ${cedulaError ? 'is-invalid' : ''}`}
                    value={cedula}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setCedula(cleaned);
                      if (cleaned.length > 0 && cleaned.length < 6) {
                        setCedulaError('La cédula debe tener entre 6 y 8 dígitos');
                      } else {
                        setCedulaError('');
                      }
                      // Clear global error when user fixes input
                      if (error && cleaned.length >= 6) setError('');
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    disabled={editando && getRol() !== 'PROFESOR'}
                    placeholder="Ej. 25123456"
                    required
                  />
                  {cedulaError && (
                    <div className="invalid-feedback">{cedulaError}</div>
                  )}
                </div>
                <div className="form-text">
                  {editando && getRol() === 'PROFESOR' ? (
                    <span className="text-info">
                      <i className="bi bi-info-circle me-1"></i>
                      Puedes corregir la cédula si hay un error tipográfico.
                    </span>
                  ) : (
                    <span>Colocar la cédula sin puntos ni guiones.</span>
                  )}
                </div>
              </div>

              <h6 className="text-secondary border-bottom pb-2 mb-3 mt-4">Datos Académicos y del Componente</h6>
              <div className="row">
                <div className="col-md-8 mb-3">
                  <label htmlFor="carrera" className="form-label fw-bold">Carrera</label>
                  <select
                    id="carrera"
                    className="form-select"
                    value={carrera}
                    onChange={(e) => setCarrera(e.target.value)}
                    required
                  >
                    <option value="">Selecciona una carrera</option>
                    <option value="Ingenieria de sistemas">Ingeniería de Sistemas</option>
                    <option value="Ingenieria de telecomunicaciones">Ingeniería de Telecomunicaciones</option>
                    <option value="Ingenieria petroquimica">Ingeniería Petroquímica</option>
                    <option value="Turismo">Turismo</option>
                    <option value="Administracion de desastres">Administración de Desastres</option>
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="semestre" className="form-label fw-bold">Semestre</label>
                  <select id="semestre" className="form-select" value={semestre} onChange={(e) => setSemestre(e.target.value)}>
                    {[...Array(8).keys()].map(n => (
                      <option key={n+1} value={n+1}>{n+1}° Semestre</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="rango_militar" className="form-label fw-bold">Rango en la Banda de Guerra</label>
                <select
                  id="rango_militar"
                  className="form-select"
                  value={rangoMilitar}
                  onChange={(e) => setRangoMilitar(e.target.value)}
                  required
                >
                  <option value="No poseo">No poseo</option>
                  <option value="Miliciano">Miliciano</option>
                  <option value="Distinguido">Distinguido</option>
                  <option value="Cabo Segundo">Cabo Segundo</option>
                  <option value="Cabo Primero">Cabo Primero</option>
                  <option value="Sargento">Sargento</option>
                  <option value="Teniente">Teniente</option>
                  <option value="Capitán">Capitán</option>
                  <option value="Mayor">Mayor</option>
                  <option value="Teniente Coronel">Teniente Coronel</option>
                  <option value="Coronel">Coronel</option>
                </select>
              </div>

              {!editando && (
                <div className="alert alert-secondary small d-flex align-items-center gap-2">
                  <i className="bi bi-info-circle-fill text-primary"></i>
                  La contraseña inicial se establecerá por defecto igual a la cédula de identidad suministrada.
                </div>
              )}
            </div>
            
            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" /> Procesando...</>
                ) : editando ? (
                  <><i className="bi bi-pencil-square me-2"></i>Guardar Cambios</>
                ) : (
                  <><i className="bi bi-person-plus me-2"></i>Registrar Estudiante</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegistroAlumnoForm;