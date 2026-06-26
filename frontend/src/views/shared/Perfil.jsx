import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';

const Perfil = () => {
  const navigate = useNavigate();
  const { getRol, updateUsuario } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    rol: '',
    carrera: '',
    semestre: '',
    rango_militar: '',
    password: '',
  });

  useEffect(() => {
    api.get('/api/usuario/perfil/')
      .then((res) => {
        setFormData({
          ...res.data,
          password: '',
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar perfil:', err);
        setError('No se pudieron cargar los datos del perfil.');
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    api.put('/api/usuario/perfil/', formData)
      .then((res) => {
        setSuccessMessage(res.data.message);
        setFormData((prevState) => ({ ...prevState, password: '' }));
        if (typeof updateUsuario === 'function' && res.data?.user) {
          updateUsuario(res.data.user);
        }
      })
      .catch((err) => {
        const backendErrors = err.response?.data;
        if (backendErrors && typeof backendErrors === 'object') {
          const firstKey = Object.keys(backendErrors)[0];
          setError(`${firstKey}: ${backendErrors[firstKey]}`);
        } else {
          setError('Ocurrió un error al actualizar el perfil.');
        }
      });
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="row justify-content-center mt-4">
      <div className="col-md-7">
        <div className="card shadow-lg border-0">
          <div className="card-header bg-dark text-warning py-3">
            <h4 className="mb-0 text-center">
              <i className="bi bi-person-gear me-2"></i>
              Editar Mi Perfil ({formData.rol === 'PROFESOR' ? 'Profesor' : 'Estudiante'})
            </h4>
          </div>
          <div className="card-body p-4">
            {error && <div className="alert alert-danger">{error}</div>}
            {successMessage && <div className="alert alert-success">{successMessage}</div>}

            <form onSubmit={handleSubmit}>
              <h6 className="text-primary border-bottom pb-2 mb-3">
                <i className="bi bi-person me-2"></i>
                Datos Personales
                {formData.rol === 'ESTUDIANTE' && (
                  <span className="badge bg-warning text-dark float-end">Solo lectura</span>
                )}
              </h6>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    Nombre
                    {formData.rol === 'ESTUDIANTE' && <span className="badge bg-info ms-2">Bloqueado</span>}
                  </label>
                  <input 
                    type="text" 
                    className="form-control bg-light" 
                    value={formData.nombre}
                    readOnly={formData.rol === 'ESTUDIANTE'}
                    disabled={formData.rol === 'ESTUDIANTE'}
                  />
                  {formData.rol === 'ESTUDIANTE' && (
                    <small className="text-muted">Los datos personales no se pueden editar. Contacta con administración.</small>
                  )}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    Apellido
                    {formData.rol === 'ESTUDIANTE' && <span className="badge bg-info ms-2">Bloqueado</span>}
                  </label>
                  <input 
                    type="text" 
                    className="form-control bg-light" 
                    value={formData.apellido}
                    readOnly={formData.rol === 'ESTUDIANTE'}
                    disabled={formData.rol === 'ESTUDIANTE'}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold text-muted">
                  Cédula
                  {formData.rol === 'ESTUDIANTE' && <span className="badge bg-info ms-2">Bloqueado</span>}
                </label>
                <input 
                  type="text" 
                  className="form-control bg-light" 
                  value={formData.cedula}
                  readOnly={formData.rol === 'ESTUDIANTE'}
                  disabled={formData.rol === 'ESTUDIANTE'}
                />
              </div>

              {formData.rol === 'ESTUDIANTE' && (
                <>
                  <h6 className="text-primary border-bottom pb-2 mb-3 mt-4">
                    <i className="bi bi-building me-2"></i>
                    Datos de la UNEFA
                  </h6>
                  <div className="row">
                    <div className="col-md-8 mb-3">
                      <label className="form-label fw-bold">Carrera</label>
                      <select 
                        name="carrera" 
                        className="form-select" 
                        value={formData.carrera} 
                        onChange={handleChange} 
                        required
                      >
                        <option value="">Selecciona una carrera</option>
                        <option value="Ingenieria de sistemas">Ingenieria de sistemas</option>
                        <option value="Ingenieria de telecomunicaciones">Ingenieria de telecomunicaciones</option>
                        <option value="Ingenieria petroquimica">Ingenieria petroquimica</option>
                        <option value="Turismo">Turismo</option>
                        <option value="Administracion de desastres">Administracion de desastres</option>
                      </select>
                      <small className="text-muted d-block mt-1">
                        <i className="bi bi-pencil-square me-1"></i>
                        Puedes actualizar tu carrera.
                      </small>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label fw-bold">Semestre</label>
                      <select 
                        name="semestre" 
                        className="form-select" 
                        value={formData.semestre} 
                        onChange={handleChange} 
                        required
                      >
                        <option value="0">CINU</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="mb-3">
                <label className="form-label fw-bold">Rango Militar</label>
                <select 
                  name="rango_militar" 
                  className="form-select" 
                  value={formData.rango_militar} 
                  onChange={handleChange} 
                  required
                >
                  <option value="No poseo">No poseo</option>
                  <option value="Miliciano">Miliciano</option>
                  <option value="Distinguido">Distinguido</option>
                  <option value="Cabo Segundo">Cabo Segundo</option>
                  <option value="Cabo Primero">Cabo Primero</option>
                  {formData.rol === 'PROFESOR' && (
                    <>
                      <option value="Sargento">Sargento</option>
                      <option value="Teniente">Teniente</option>
                      <option value="Capitán">Capitán</option>
                      <option value="Mayor">Mayor</option>
                      <option value="Teniente Coronel">Teniente Coronel</option>
                      <option value="Coronel">Coronel</option>
                    </>
                  )}
                </select>
                {formData.rol === 'ESTUDIANTE' && (
                  <small className="text-info d-block mt-2">
                    <i className="bi bi-info-circle me-1"></i>
                    Puedes actualizar tu rango militar aquí.
                  </small>
                )}
              </div>

              <h6 className="text-danger border-bottom pb-2 mb-3 mt-4">
                <i className="bi bi-shield-lock me-2"></i>
                Seguridad
              </h6>
              <div className="mb-4">
                <label className="form-label fw-bold">
                  <i className="bi bi-key me-2"></i>
                  Cambiar Contraseña
                </label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Dejar en blanco para no cambiar"
                />
                <small className="text-muted d-block mt-2">
                  Ingresa una nueva contraseña si deseas cambiarla. Si dejas este campo vacío, tu contraseña actual se mantiene.
                </small>
              </div>

              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-primary btn-lg">Guardar Cambios</button>
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() => navigate(formData.rol === 'PROFESOR' ? '/profesor-dashboard' : '/dashboard')}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
