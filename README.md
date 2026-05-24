# Bandwar SGA - Sistema de Gestión de Aprendizaje enfocado en la banda de guerra de la UNEFA

Este es el repositorio central del prototipo **Bandwar SGA**, desarrollado como solución tecnológica integral para la automatización, control de inventario y gestión del conocimiento de la banda de guerra de la UNEFA-Falcon.

---

##  Arquitectura del Sistema (Doc-as-Code)

De acuerdo con los lineamientos técnicos establecidos en la Fase #2, la arquitectura estructural y el flujo de datos del sistema se encuentran modelados directamente en código utilizando **Mermaid.js**.

### 1. Diagrama de Bloques y Flujo de Datos

```mermaid
graph TD
    %% Componentes principales
    subgraph Cliente [Cliente Navegador]
        Three[Motor de Renderizado Three.js]
        JS[Lógica de Interfaz JavaScript / Fetch]
        Boot[Estilos Bootstrap 5]
    end

    subgraph Servidor [Servidor Django Framework - Arquitectura Híbrida]
        VHTML[Vistas de Renderizado HTML]
        VAPI[Vistas de Datos API REST]
        ORM[ORM de Django]
    end

    subgraph Persistencia [Capa de Datos]
        Postgres[(Base de datos PostgreSQL)]
    end

    %% Flujos de conexión
    Cliente <-->|Intercambio Asíncrono HTTPS / JSON| Servidor
    Servidor <-->|Lectura / Escritura| Persistencia
```

### 2. Flujo de Control para la Integración Continua (CI)

```mermaid
sequenceDiagram
    participant Dev as Desarrollador (Local)
    participant GH as GitHub Repository
    participant Action as GitHub Action (Robot CI)
    
    Dev->>GH: git push origin feature/rama
    Dev->>GH: Apertura de Pull Request (PR)
    Note over GH: Se dispara el Pipeline Automático
    GH->>Action: Iniciar contenedor Ubuntu
    Action->>Action: 1. Descargar Código (Checkout)
    Action->>Action: 2. Configurar Python & Instalar Django
    Action->>Action: 3. Ejecutar Verificación de Sintaxis
    Alt Si el código es correcto
        Action-->>GH: Check Verde (Éxito)
    Else Si hay errores
        Action-->>GH: Log de Error en Rojo (Fallo)
    End
```
### 3. Diagrama de Secuencia: Carga del Dashboard del Estudiante

```mermaid
sequenceDiagram
    actor Estudiante
    participant Frontend as Interfaz (JS/Three.js)
    participant Backend as Servidor (Django)
    participant DB as Base de Datos (PostgreSQL)

    Estudiante->>Frontend: 1. Accede al Dashboard (/usuarios/home/)
    Frontend->>Backend: 2. Solicita carga de la página (GET)
    Backend->>DB: 3. Valida sesión y consulta instrumento asignado
    DB-->>Backend: 4-5. Retorna datos de persistencia
    Backend-->>Frontend: 6. Retorna HTML base (Cargando...)
    Frontend->>Backend: 7. Petición asíncrona para ruta .glb
    Backend->>DB: 8. Obtiene ruta del archivo .glb
    DB-->>Backend: Retorna URL
    Backend-->>Frontend: 9-10. Responde JsonResponse con URL del modelo
    Frontend->>Frontend: 11. InicializarThreeJS(ruta_modelo)
    Frontend-->>Estudiante: 12. Visualiza e interactúa con instrumento 3D
```
### 4. Diagrama de casos de uso: 
```mermaid
flowchart LR
    %% Actores
    Est[/"👤 Estudiante"/]
    Admin[/"👤 Administrador"/]
    Prof[/"👤 Profesor"/]

    %% Sistema y Casos de Uso Comunes
    subgraph BANDWAR_LMS [BANDWAR LMS]
        Login((Iniciar Sesión))
        
        subgraph ModEstudiante [Módulo Estudiante]
            direction TB
            UC_E1((Ver Instrumento Asignado))
            UC_E2((Visualizar Modelo 3D))
            UC_E3((Ver Exámenes Disponibles))
            UC_E4((Realizar Examen))
            UC_E5((Editar Perfil Propio))
        end

        subgraph ModAdmin [Módulo Administrador]
            direction TB
            UC_A1((Añadir Profesores))
            UC_A2((Gestionar Usuarios))
            UC_A3((Gestionar Reportes))
            UC_A4((Cambiar Contraseña Propia))
        end

        subgraph ModProfesor [Módulo Profesor]
            direction TB
            UC_P1((Inscribir Estudiantes))
            UC_P2((Asignar Instrumento))
            UC_P3((Gestionar Instrumentos))
            UC_P4((Asignar Evaluaciones))
            UC_P5((Revisar Evaluaciones))
            UC_P6((Ver Resultados))
            UC_P7((Editar Perfil))
        end
    end

    %% Relaciones de Login
    Est --> Login
    Admin --> Login
    Prof --> Login

    %% Relaciones Estudiante
    Est --> UC_E1
    Est --> UC_E3
    Est --> UC_E4
    Est --> UC_E5
    UC_E1 -.->|include| UC_E2

    %% Relaciones Administrador
    Admin --> UC_A1
    Admin --> UC_A2
    Admin --> UC_A3
    Admin --> UC_A4

    %% Relaciones Profesor
    Prof --> UC_P1
    Prof --> UC_P2
    Prof --> UC_P3
    Prof --> UC_P4
    Prof --> UC_P5
    Prof --> UC_P7
    UC_P5 -.->|include| UC_P6
```

### 5. Diagrama de Flujo: Registro Estudiantil 
```mermaid
flowchart TD
    Start((Inicio Registro Nuevo Aspirante)) --> Cond1{¿Credenciales Admin válidas?}
    Cond1 -- No --> End1([Acceso Denegado])
    Cond1 -- Sí --> Act1[Ingresar datos del aspirante]
    Act1 --> Cond2{¿Cédula ya existe?}
    Cond2 -- Sí --> End2([Error: Estudiante ya existe])
    Cond2 -- No --> Act2[Crear perfil de estudiante Nivel Recluta]
    Act2 --> Act3[Generar password_hash encriptada]
    Act3 --> Act4[(Insertar nuevo usuario en DB)]
    Act4 --> Act5[Asignar usuario al grupo especificado]
    Act5 --> Act6[(Insertar asignación en Usuario_Grupo)]
    Act6 --> Act7[(Guardar log de auditoría)]
    Act7 --> Act8[Notificar éxito al Profesor]
    Act8 --> Act9[Entregar credenciales temporalmente]
    Act9 --> Act10[Estudiante ingresa por primera vez]
    Act10 --> End3([Estudiante registrado exitosamente])
```
### 6. Diagrama de Flujo: Módulo de Evaluaciones 
```mermaid
flowchart TD
    Start([Estudiante ingresa al módulo de evaluaciones]) --> C1{¿Tiene sesión activa?}
    C1 -- No --> End1([Acceso Denegado: Consulte Instructor])
    C1 -- Sí --> C2{¿Registrado por profesor asignado?}
    C2 -- No --> End1
    C2 -- Sí --> A1[Consultar exámenes asignados]
    A1 --> C3{¿Tiene examen pendiente?}
    C3 -- No --> End2([Mensaje: No tienes evaluaciones pendientes])
    C3 -- Sí --> A2[Seleccionar examen y responder cuestionario]
    
    A2 --> A3[Procesar respuestas y calcular calificación]
    A3 --> A4[(Guardar resultado y actualizar historial)]
    A4 --> A5[Generar reporte de resultado]
    A5 --> C4{¿Aprobó la evaluación?}
    
    C4 -- No --> End3([Mensaje: Sigue practicando])
    C4 -- Sí --> End4([Mensaje: ¡Nivel Superado!])
    
    %% Estilos de colores condicionales básicos
    style End1 fill:#ffcccc,stroke:#cc0000
    style End2 fill:#e6e6e6,stroke:#999999
    style End3 fill:#ffcccc,stroke:#cc0000
    style End4 fill:#ccffcc,stroke:#009900
```
### 7. Diagrama Entidad-Relación (Base de Datos)
```mermaid
erDiagram
    %% Relaciones
    Usuario ||--o{ Usuario_Grupo : "tiene"
    Grupo ||--o{ Usuario_Grupo : "pertenece"
    Grupo ||--o{ Grupo_Permiso : "posee"
    Permiso ||--o{ Grupo_Permiso : "asignado a"
    
    Usuario ||--o{ Instrumento : "se le asigna"
    
    Examen ||--o{ Pregunta : "contiene"
    Pregunta ||--o{ Opcion : "tiene alternativas"
    
    Usuario ||--o{ ResultadoExamen : "realiza"
    Examen ||--o{ ResultadoExamen : "genera"
    
    ResultadoExamen ||--o{ RespuestaEstudiante : "incluye"
    Pregunta ||--o{ RespuestaEstudiante : "es respondida en"
    Opcion ||--o{ RespuestaEstudiante : "es seleccionada en"

    %% Entidades (Atributos Principales)
    Usuario {
        INT id PK
        VARCHAR cedula "UNIQUE"
        VARCHAR nombre
        VARCHAR email
        VARCHAR password_hash
        BOOLEAN activo
    }
    Grupo {
        INT id PK
        VARCHAR nombre "UNIQUE"
        BOOLEAN activo
    }
    Usuario_Grupo {
        INT id PK
        INT usuario_id FK
        INT grupo_id FK
    }
    Permiso {
        INT id PK
        VARCHAR nombre
        VARCHAR modulo
    }
    Grupo_Permiso {
        INT id PK
        INT grupo_id FK
        INT permiso_id FK
    }
    Instrumento {
        INT id PK
        VARCHAR nombre
        VARCHAR modelo_3d_url
        VARCHAR estado
        INT usuario_id FK "Nullable"
    }
    Examen {
        INT id PK
        VARCHAR titulo
        BOOLEAN activo
    }
    Pregunta {
        INT id PK
        INT examen_id FK
        VARCHAR texto
        VARCHAR tipo
    }
    Opcion {
        INT id PK
        INT pregunta_id FK
        VARCHAR texto
        BOOLEAN es_correcta
    }
    ResultadoExamen {
        INT id PK
        INT usuario_id FK
        INT examen_id FK
        DECIMAL puntaje
        VARCHAR estado
    }
    RespuestaEstudiante {
        INT id PK
        INT resultado_examen_id FK
        INT pregunta_id FK
        INT opcion_id FK
        BOOLEAN es_correcta
    }
```


