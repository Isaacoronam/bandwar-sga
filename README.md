# Bandwar SGA - Sistema de Gestión de Aprendizaje enfocado en la banda de guerra de la UNEFA

Este es el repositorio central del prototipo **Bandwar SGA**, desarrollado como solución tecnológica integral para la automatización, control de inventario y gestión del conocimiento de la banda de guerra de la UNEFA-Falcon.

---

##  Arquitectura del Sistema (Doc-as-Code)

De acuerdo con los lineamientos técnicos establecidos en la Fase #2, la arquitectura estructural y el flujo de datos del sistema se encuentran modelados directamente en código utilizando **Mermaid.js**.

### 1. Diagrama de Bloques y Flujo de Datos

```mermaid
graph TD
    %% Componentes principales
    subgraph Frontend [Aplicación Cliente - SPA]
        React[React + Vite.js]
        Three[Componentes 3D / Three.js]
    end

    subgraph Backend [Servidor de Aplicación - REST API]
        Django[Django Web Framework]
        ORM[Django ORM]
    end

    subgraph Almacenamiento [Capa de Datos Estructurada]
        Postgres[(Base de Datos PostgreSQL)]
    end

    %% Flujos de conexión
    React -->|Peticiones HTTP / JSON| Django
    Three -->|Interacción Visual| React
    Django -->|Mapeo de Modelos| ORM
    ORM -->|Consultas SQL / Puerto 5432| Postgres
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