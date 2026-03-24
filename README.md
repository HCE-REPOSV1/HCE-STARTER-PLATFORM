# Jarvis Platform

> Internal Developer Platform (IDP) para generación automatizada de microservicios NestJS orientados a salud digital.

**Autor:** XXXXXXX — Equipo de Arquitectura de Software  
**Proyecto:** Jarvis Platform  
**Versión:** 1.0.0

---

## Acerca del proyecto

Jarvis Platform es una plataforma de autoservicio para equipos de desarrollo de XXXXXXX. Permite generar microservicios NestJS completos a partir de la configuración de dominios clínicos, datasources y parámetros técnicos, sin necesidad de scaffolding manual.

Está inspirada en el concepto de IDP (Internal Developer Platform): estandarización de arquitectura, trazabilidad de generaciones y reducción del tiempo de bootstrap de nuevos servicios.

### Estrategias de generación

| Tipo | Estrategia | Salida |
|------|-----------|--------|
| `UX` | API First | `openapi.yaml` (contrato Swagger) |
| `CN` | BFF Canal | Microservicio NestJS de integración |
| `BS` | BFF Negocio | Microservicio NestJS con lógica clínica |

---

## Requisitos

| Herramienta | Versión |
|-------------|---------|
| Node.js     | 20.x+   |
| npm         | 10.x+   |
| NestJS CLI  | 11.x    |

---

## Estructura del monorepo

```
jarvis-platform/
├── jarvis-server/          # API NestJS — puerto 3000
│   ├── config/             # Persistencia JSON
│   ├── src/                # Módulos NestJS
│   └── README.md
├── jarvis-ui/              # Frontend React + Vite — puerto 5173
│   ├── src/
│   └── README.md
├── jarvis-cli/             # CLI de generación (core engine)
│   ├── commands/
│   ├── generators/
│   └── templates/
└── README.md               # Este archivo
```

---

## Instalación rápida

### Sin Docker (desarrollo local)

```bash
# Backend
cd jarvis-server
npm install
npm run start:dev   # http://localhost:10400

# Frontend (nueva terminal)
cd jarvis-ui
npm install
npm run dev         # http://localhost:10500
```

El frontend usa el proxy de Vite: las llamadas a `/api` se redirigen automáticamente a `localhost:10400`.

Accede a `http://localhost:10500` con `admin` / `admin123`.

---

## Docker

### Requisitos
- Docker Desktop (o Docker Engine + Compose Plugin)

### Puertos

| Servicio | Host | Interno |
|----------|------|---------|
| jarvis-ui (nginx) | `10500` | 80 |
| jarvis-server (NestJS) | `10400` | 3000 |

### Red Docker

La red `jarvis-net` es creada automáticamente por Docker Compose al hacer `up`. No es necesario crearla manualmente. Solo como referencia, el comando equivalente sería:

```bash
docker network create jarvis-net
```

Para ver las redes existentes:

```bash
docker network ls
```

### Primera vez

```bash
docker compose up --build -d
```

- UI: `http://localhost:10500` — usuario `admin` / `admin123`
- API (Swagger / Postman): `http://localhost:10400/api`

### Flujo normal con cambios en código

```bash
docker compose down
docker compose up --build -d
```

> La data **no se pierde** con estos comandos. El volumen `jarvis-config-data` persiste de forma independiente a los contenedores e imágenes.

### Otros comandos útiles

```bash
docker compose logs -f              # logs en tiempo real
docker compose logs -f jarvis-server
docker compose logs -f jarvis-ui
docker compose stop                 # detiene sin eliminar contenedores
docker compose up -d                # levanta sin rebuild
```

### Persistencia de datos

Toda la data (datasources, dominios, OpenAPI specs, historial, usuarios, templates) vive en el volumen Docker `jarvis-config-data`, montado en `/app/config` del contenedor.

| Acción | ¿Se pierde la data? |
|--------|-------------------|
| `docker compose stop` | No |
| `docker compose down` | No |
| `docker compose up --build` | No |
| `docker compose down --volumes` | **Sí** — borra el volumen |
| `docker volume rm jarvis-config-data` | **Sí** — borrado manual |

> **Regla:** nunca agregar `--volumes` al `down` salvo que se quiera resetear todo a cero.

### Backup

```bash
./backup.sh   # genera jarvis-backup-FECHA.tar.gz en el directorio actual
```

### Arquitectura Docker

```
Browser
  │
  ├── :10500  → jarvis-ui (nginx)
  │               ├── /        → archivos estáticos (React build)
  │               └── /api/*   → proxy interno → jarvis-server:3000
  │
  └── :10400  → jarvis-server (NestJS) — acceso directo para Postman/Swagger
```

Ambos servicios comparten la red interna `jarvis-net`. El proxy de nginx resuelve el backend por nombre de contenedor (`jarvis-server`), sin pasar por el host.

---

## Diagrama de arquitectura — C4 Model

### Nivel 1 — Contexto del sistema

```mermaid
C4Context
  title Jarvis Platform — Contexto del sistema

  Person(dev, "Desarrollador", "Equipo de desarrollo de XXXXXXX")
  Person(admin, "Administrador", "Gestiona usuarios, templates y configuraciones")

  System(jarvis, "Jarvis Platform", "IDP para generación automatizada de microservicios NestJS orientados a salud digital")

  System_Ext(db, "Base de datos clÃ­nica", "PostgreSQL / MySQL con esquemas FHIR")
  System_Ext(git, "Repositorio Git", "GitHub / GitLab para push automático del código generado")

  Rel(dev, jarvis, "Configura dominios y genera microservicios", "HTTPS")
  Rel(admin, jarvis, "Administra usuarios, templates y logs", "HTTPS")
  Rel(jarvis, db, "Introspección de esquema", "TCP")
  Rel(jarvis, git, "Push del código generado (opcional)", "HTTPS")
```

---

### Nivel 2 — Contenedores

```mermaid
C4Container
  title Jarvis Platform — Contenedores

  Person(dev, "Desarrollador / Admin", "Usuario de la plataforma")

  Container(ui, "Jarvis UI", "React 19 + Vite 8", "Portal web — wizard de generación y módulos de mantenimiento. Puerto 5173")
  Container(server, "Jarvis Server", "NestJS 11 + TypeScript", "API REST — motor de generación, CRUD de dominios, datasources, usuarios y logs. Puerto 3000")
  Container(cli, "Jarvis CLI", "Node.js", "Core engine de generación de código y scaffolding de templates")
  ContainerDb(config, "config/*.json", "File System (JSON)", "Persistencia ligera: dominios, usuarios, logs, generaciones, templates")

  System_Ext(db, "Base de datos clÃ­nica", "PostgreSQL / MySQL")
  System_Ext(git, "Repositorio Git", "GitHub / GitLab")

  Rel(dev, ui, "Usa", "HTTPS / Browser")
  Rel(ui, server, "Llama a la API", "HTTP REST / JSON")
  Rel(server, cli, "Invoca el motor de generación", "Node.js module")
  Rel(server, config, "Lee y escribe", "fs / JSON")
  Rel(server, db, "Introspección de tablas y columnas", "TCP")
  Rel(server, git, "Push del código generado", "HTTPS (opcional)")
```

---

### Nivel 3 — Componentes (Jarvis Server)

```mermaid
C4Component
  title Jarvis Server — Componentes

  Container(ui, "Jarvis UI", "React + Vite", "Portal web")

  Component(auth, "AuthModule", "NestJS Module", "Login y validación de token contra config/security.json")
  Component(users, "UsersModule", "NestJS Module", "CRUD de usuarios con roles ADMIN / DEV")
  Component(datasource, "DatasourceModule", "NestJS Module", "CRUD de conexiones BD + introspección de tablas y columnas")
  Component(domains, "DomainsModule", "NestJS Module", "CRUD de dominios clínicos con entidades tipadas (FHIR-ready)")
  Component(generator, "GeneratorModule", "NestJS Module", "Motor de generación: UX → openapi.yaml, CN/BS → microservicio NestJS + ZIP")
  Component(genconfig, "GenerationConfigModule", "NestJS Module", "Configuraciones avanzadas reutilizables (arquitectura, ORM, auth, Git)")
  Component(generations, "GenerationsModule", "NestJS Module", "Historial de generaciones con re-descarga de ZIP")
  Component(templates, "TemplatesModule", "NestJS Module", "Catálogo de templates de generación")
  Component(logs, "LogsModule", "NestJS Module", "Audit trail global con filtros por usuario, módulo, nivel y fecha")

  ContainerDb(config, "config/*.json", "File System", "Persistencia JSON")

  Rel(ui, auth, "POST /auth/login", "HTTP")
  Rel(ui, users, "CRUD /users", "HTTP")
  Rel(ui, datasource, "CRUD /datasources", "HTTP")
  Rel(ui, domains, "CRUD /domains", "HTTP")
  Rel(ui, generator, "POST /generate", "HTTP")
  Rel(ui, genconfig, "CRUD /generation-config", "HTTP")
  Rel(ui, generations, "GET /generations", "HTTP")
  Rel(ui, templates, "CRUD /templates", "HTTP")
  Rel(ui, logs, "GET /logs", "HTTP")

  Rel(auth, config, "Lee security.json")
  Rel(users, config, "Lee/escribe users.json")
  Rel(datasource, config, "Lee/escribe datasources.json")
  Rel(domains, config, "Lee/escribe domains.json")
  Rel(generator, config, "Escribe generations.json")
  Rel(generations, config, "Lee generations.json")
  Rel(templates, config, "Lee/escribe templates.json")
  Rel(logs, config, "Lee/escribe logs.json")
```

---

### Nivel 4 — Código (GeneratorModule)

```mermaid
C4Component
  title GeneratorModule — Detalle de código

  Component(ctrl, "GeneratorController", "NestJS Controller", "Recibe POST /generate, retorna ZIP como stream binario con cabecera x-generation-id")
  Component(svc, "GeneratorService", "NestJS Service", "Orquesta la generación: selecciona estrategia, construye archivos, empaqueta ZIP")
  Component(ux, "UX Strategy", "Función interna", "Genera openapi.yaml con paths y schemas basados en las entidades del dominio")
  Component(bff, "BFF Strategy (CN/BS)", "Función interna", "Genera estructura NestJS hexagonal/clean/layered: módulo, controller, service, entities, Dockerfile, .env, README")
  Component(zip, "ZIP Engine", "archiver (npm)", "Empaqueta todos los archivos generados en un buffer ZIP descargable")
  Component(logsvc, "LogsService", "NestJS Service", "Registra cada generación en el audit trail")
  Component(gensvc, "GenerationsService", "NestJS Service", "Persiste el registro de la generación en generations.json")

  Rel(ctrl, svc, "Llama a generate(dto)")
  Rel(svc, ux, "Si dto.type === UX")
  Rel(svc, bff, "Si dto.type === CN o BS")
  Rel(svc, zip, "Empaqueta archivos generados")
  Rel(svc, logsvc, "Registra evento INFO/ERROR")
  Rel(svc, gensvc, "Persiste historial de generación")
  Rel(ctrl, zip, "Retorna buffer como application/zip")
```

---

## Flujo de uso

```
Login
  │
  ├── Configuración
  │     ├── DataSources  → registrar conexiones BD
  │     ├── Domains      → definir entidades clÃ­nicas (estilo FHIR)
  │     ├── Templates    → gestionar catálogo de templates
  │     └── Users        → administrar equipo
  │
  └── Generación
        ├── Initialize   → wizard 5 pasos → descarga ZIP
        ├── Generations  → historial + re-descarga
        └── Logs         → audit trail completo
```

---

## Dominios sugeridos según HL7 FHIR R4

| Dominio | Entidades | Tipo |
|---------|-----------|------|
| Patient | Patient, RelatedPerson | BS |
| Encounter | Encounter, EpisodeOfCare | BS |
| Observation | Observation, DiagnosticReport | BS |
| Medication | Medication, MedicationRequest | BS |
| Appointment | Appointment, Schedule, Slot | CN |
| Practitioner | Practitioner, PractitionerRole | BS |
| Organization | Organization, Location | BS |
| Claim | Claim, ClaimResponse | BS |
| DocumentReference | DocumentReference, Composition | UX |
| Procedure | Procedure, ServiceRequest | BS |

> Referencia: [HL7 FHIR R4](https://hl7.org/fhir/R4/resourcelist.html)

---

## Documentación detallada

- [jarvis-server/README.md](./jarvis-server/README.md) — Manual técnico del backend
- [jarvis-ui/README.md](./jarvis-ui/README.md) — Manual de usuario del frontend

---

## Credenciales por defecto

```
usuario: admin
password: admin123
```

Definidas en `jarvis-server/config/security.json`.
