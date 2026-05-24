# Guía de Contribución - Bandwar SGA

¡Bienvenido al repositorio de desarrollo de **Bandwar SGA**! Para mantener un historial de código limpio, profesional y automatizado bajo los estándares exigidos por la UNEFA y el profesor Robert Gonzalez, todo el equipo debe seguir las siguientes reglas de GitFlow y Conventional Commits.

---

## 1. Modelo de Trabajo: GitFlow Adaptado

Nadie tiene permitido realizar cambios directamente sobre las ramas principales. El flujo de trabajo obligatorio se divide en tres niveles:

* **`main`**: Rama exclusiva para código 100% estable, probado y listo para la entrega final. Contiene los hitos del proyecto.
* **`Develop`**:El corazón del desarrollo diario. Aquí se fusionan todas las ramas de trabajo para probar que el sistema funcione en conjunto antes de pasar a main.
* **Ramas de Trabajo (`Features / Fixes`)**: Ramas independientes creadas únicamente a partir de develop para trabajar de forma aislada.

### Formato para el Nombramiento de Ramas:
* Para nuevas características o módulos: `feature/nombre-de-la-mejora` (Ejemplo: `feature/modulo-inventario`).
* Para corrección de errores de código: `fix/nombre-del-error` (Ejemplo: `fix/conexion-postgres`).
* Para tareas de mantenimiento o documentación: `chore/tarea` (Ejemplo: `chore/actualizar-readme`).

---

## 2. Estándar de Mensajes de Commit (Conventional Commits)

La bitácora de cambios se alimenta automáticamente de los mensajes de nuestros commits. Cada commit debe seguir la estructura: `<tipo>: <descripción corta en minúsculas>`

### Tipos Permitidos:
* **`feat:`** Nueva funcionalidad para el sistema (Ejemplo: `feat: agregar vista de gestion de instrumentos`).
* **`fix:`** Corrección de un error o bug (Ejemplo: `fix: corregir mapeo de puerto 5432 en postgres`).
* **`chore:`** Tareas que no modifican el código de la aplicación, como configuraciones o documentación (Ejemplo: `chore: crear archivo de reglas de contribucion`).
* **`docs:`** Cambios exclusivos en la documentación (Ejemplo: `docs: agregar manual de instalacion`).

---

## 3. Proceso de Integración y Revisión (Peer Review)

1. Asegúrate de estar actualizado con el servidor: `git checkout develop` y luego `git pull origin develop`.
2. Crea tu rama de trabajo desde ahí: (`git checkout -b feature/tu-tarea.`).
3. Desarrolla tus cambios y realiza los commits siguiendo el estándar.
4. Sube tu rama a GitHub: (`git push origin feature/tu-rama`).
5. Abre un Pull Request (PR) apuntando EXCLUSIVAMENTE hacia la rama `develop`
6. El pipeline automático (GitHub Actions) evaluará que el código compile y pase los filtros básicos.
7. Un compañero de equipo deberá revisar el código en GitHub, dejar comentarios si es necesario y dar su Aprobación (Approve).
8. Una vez aprobado y con el check de integración en verde, se realiza el Merge a `develop`

## 4. El Paso Final hacia `main` (Cierre de Entrega):
Cuando todas las funcionalidades planificadas para la evaluación estén integradas en `develop` y el sistema sea completamente estable, se abrirá un Pull Request especial desde `develop` hacia `main` para congelar la versión final de la entrega.