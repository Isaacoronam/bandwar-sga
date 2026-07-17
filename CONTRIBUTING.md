# Guía de Contribución - Bandwar SGA

¡Bienvenido al repositorio de desarrollo de **Bandwar SGA**! Para mantener un historial de código limpio, profesional y automatizado bajo los estándares exigidos por la UNEFA y el profesor Robert Gonzalez, todo el equipo debe seguir las siguientes reglas de GitFlow y Conventional Commits.

## 1. Modelo de Trabajo: GitFlow de Tres Capas

Nadie tiene permitido realizar cambios directamente sobre las ramas principales. El flujo de trabajo obligatorio se divide en tres niveles:

* **`main` (Producción):** Rama exclusiva para código 100% estable, probado y listo para la entrega final. Contiene los hitos del proyecto.
* **`develop` (Integración):** El corazón del desarrollo diario. Aquí se fusionan todas las ramas de trabajo para probar que el sistema funcione en conjunto antes de pasar a `main`.
* **Ramas de Trabajo (`feature/`, `fix/`, `chore/`):** Ramas independientes creadas **únicamente a partir de `develop`** para trabajar de forma aislada.

### Formato para el Nombramiento de Ramas:
* Para nuevas características o módulos del PMV: `feature/nombre-de-la-mejora` (Ejemplo: `feature/modulo-autenticacion`).
* Para corrección de errores en código de integración: `fix/nombre-del-error` (Ejemplo: `fix/conexion-postgres`).
* Para tareas de mantenimiento o documentación: `chore/tarea` o `docs/tarea` (Ejemplo: `chore/actualizar-readme`).

---

## 2. Estándar de Mensajes de Commit (Conventional Commits)

La bitácora de cambios se alimenta automáticamente de los mensajes de nuestros commits. Cada commit debe seguir la estructura: `<tipo>: <descripción corta en minúsculas>`

### Tipos Permitidos:
* **`feat`:** Nueva funcionalidad para el sistema (Ejemplo: `feat: agregar vista de login con django`).
* **`fix`:** Corrección de un error o bug (Ejemplo: `fix: corregir validacion de contraseña vacia`).
* **`chore`:** Tareas de configuración que no modifican código de la aplicación (Ejemplo: `chore: configurar reglas de rama develop`).
* **`docs`:** Cambios exclusivos en la documentación o diagramas (Ejemplo: `docs: agregar instrucciones de instalacion al readme`).

---

## 3. Proceso de Integración y Revisión (Peer Review)

1. Asegúrate de estar actualizado con el servidor: `git checkout develop` y luego `git pull origin develop`.
2. Crea tu rama de trabajo desde ahí: `git checkout -b feature/tu-tarea`.
3. Desarrolla tus cambios y realiza los commits siguiendo el estándar.
4. Sube tu rama a GitHub: `git push origin feature/tu-rama`.
5. Abre un **Pull Request (PR) apuntando EXCLUSIVAMENTE hacia la rama `develop`**.
6. El pipeline automático (GitHub Actions) evaluará que el código compile y pase los filtros básicos.
7. Un compañero de equipo deberá revisar el código en GitHub, dejar comentarios si es necesario y dar su **Aprobación (Approve)**.
8. Una vez aprobado y con el check de integración en verde, se realiza el **Merge a `develop`**.

### El Paso Final hacia `main` (Cierre de Entrega):
Cuando todas las funcionalidades planificadas para la evaluación estén integradas en `develop` y el sistema sea completamente estable, se abrirá un Pull Request especial **desde `develop` hacia `main`** para congelar la versión final de la entrega.

---

## 4. Checklist Antes de Pushear Código

Antes de ejecutar `git push`, asegúrate de que:

- [ ] Tu código está en la rama correcta (`feature/...`, `fix/...`, etc.)
- [ ] Los cambios son coherentes con el mensaje de commit
- [ ] **Backend**: No hay errores de sintaxis
  ```bash
  python -m py_compile backend/core/models.py backend/core/views.py
  ```
- [ ] **Frontend**: Lint pasa correctamente
  ```bash
  cd frontend
  npm run lint
  ```
- [ ] Tus commits siguen Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- [ ] Documentaste cambios significativos en comentarios de código
- [ ] No incluiste archivos sensibles (`.env`, `__pycache__`, `node_modules`)
- [ ] Ejecutaste `git pull origin develop` para sincronizarte antes de pushear

---

## 5. Proceso de Pull Request (PR)

### Crear un PR
1. Sube tu rama a GitHub: `git push origin feature/tu-tarea`
2. Ve a GitHub y abre un PR hacia **`develop`** (NO a `main`)
3. Completa el template del PR con:
   - **Descripción**: Qué cambios hace y por qué
   - **Testing**: Cómo probaste los cambios
   - **Screenshots**: Si es UI, adjunta capturas
   - **Checklist**: Marca los elementos completados

### Titulo del PR
Usa el formato: `[TIPO] Descripción clara`
- Ejemplos: `[FEAT] Agregar selector de idioma`, `[FIX] Corregir autenticación JWT`

### Esperando Aprobación
- El pipeline automático (GitHub Actions) ejecutará:
  - ✅ Linting del código
  - ✅ Verificación de sintaxis
  - ✅ (Próximamente) Pruebas unitarias
- Un compañero de equipo revisará el código y dejará feedback
- Si hay cambios solicitados, actualiza tu rama localmente, haz los cambios y pushea de nuevo
- El PR se actualizará automáticamente

### Merge
- Una vez aprobado y con todos los checks en verde, **un líder de equipo** realizará el merge
- **Opción de merge**: Squash + Merge (para mantener commits limpios)
- Después del merge, la rama se eliminará automáticamente

---

## 6. Reglas de Oro

🚫 **PROHIBIDO:**
- Pushear directamente a `main` o `develop`
- Hacer commits sin mensajes significativos
- Incluir cambios sin revisar
- Mezclar múltiples features en un solo commit
- Comitear archivos `.env` o credenciales

✅ **OBLIGATORIO:**
- Siempre usar ramas feature/fix/chore/docs
- Escribir commits atómicos y descriptivos
- Crear PRs antes de mergear
- Esperar aprobación de al menos un compañero
- Mantener la rama actualizada con `develop`

---

## 7. Ejemplo Práctico: Flujo Completo

```bash
# 1. Asegúrate de estar en develop y actualizado
git checkout develop
git pull origin develop

# 2. Crea una rama de trabajo
git checkout -b feature/agregar-validacion-login

# 3. Realiza tus cambios (edita archivos)
# ... (desarrollo)

# 4. Verifica tus cambios
git status                    # Ver archivos modificados
git diff                      # Ver diferencias

# 5. Prepara los cambios
git add backend/core/views.py
git add frontend/src/views/auth/Login.jsx

# 6. Realiza un commit siguiendo Conventional Commits
git commit -m "feat: agregar validacion de email en login"

# 7. Verifica antes de pushear
python -m py_compile backend/core/views.py  # Backend OK?
npm run lint --prefix frontend               # Frontend OK?

# 8. Pushea tu rama
git push origin feature/agregar-validacion-login

# 9. Ve a GitHub y abre un Pull Request
#    - Título: "[FEAT] Agregar validación de email en login"
#    - Descripción: Explica qué hace y por qué
#    - Espera revisión y aprobación
```

---
