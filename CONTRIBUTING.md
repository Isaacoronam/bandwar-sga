# Guía de Contribución - Bandwar SGA

¡Bienvenido al repositorio de desarrollo de **Bandwar SGA**! Para mantener un historial de código limpio, profesional y automatizado bajo los estándares exigidos por la UNEFA y el profesor Robert Gonzalez, todo el equipo debe seguir las siguientes reglas de GitFlow y Conventional Commits.

---

## 1. Modelo de Trabajo: GitFlow Adaptado

Nadie tiene permitido realizar cambios directamente sobre la rama `main`. El flujo de trabajo obligatorio es el siguiente:

* **`main`**: Rama exclusiva de producción. Contiene únicamente código estable que ha sido revisado y aprobado.
* **Ramas de Trabajo (`Features / Fixes`)**: Cada nueva funcionalidad o corrección de error debe desarrollarse en una rama independiente creada a partir de `main`.

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

1. Desarrolla tus cambios en tu rama local correspondiente.
2. Sube tu rama a GitHub (`git push origin feature/tu-rama`).
3. Abre un **Pull Request (PR)** apuntando hacia `main`.
4. El pipeline automático (CI/CD) evaluará que el código no esté roto.
5. Un compañero de equipo (**Par Revisor**) deberá revisar el código, dejar comentarios si es necesario y dar su **Aprobación**.
6. Una vez aprobado y con el check de CI en verde, se podrá realizar el **Merge** a `main`.