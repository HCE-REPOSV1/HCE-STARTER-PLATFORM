# Jarvis Server

> API backend de la plataforma Jarvis — Internal Developer Platform (IDP) para generación de microservicios NestJS.

**Autor:** Clínica San Felipe — Equipo de Arquitectura de Software  
**Versión:** 0.0.1  
**Stack:** NestJS 11 · TypeScript 5 · Node.js 20+

---

## Acerca del proyecto

Jarvis Server es el núcleo de la plataforma Jarvis. Expone una API REST que permite configurar dominios clínicos, datasources, templates y generar microservicios NestJS completos (código fuente + Dockerfile + .env + README + openapi.yaml) empaquetados en un archivo ZIP descargable.

Está diseñado bajo los principios de una IDP (Internal Developer Platform): autoservicio, trazabilidad y estandarización de arquitectura para equipos de desarrollo de salud digital.

---

## Requisitos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js     | 20.x          |
| npm         | 10.x          |
| NestJS CLI  | 11.x          |

Bases de datos soportadas para introspección (opcional):

- PostgreSQL 13+
- MySQL 8+

---

## Instalación

```bash
cd jarvis-server
npm install
```

---

## Ejecución

```bash
# Desarrollo (watch mode)
npm run start:dev

# Producción
npm run build
npm run start:prod
```

El servidor levanta en `http://localhost:3000`.

---

## Estructura de carpetas

```
jarvis-server/
├── config/                     # Persistencia JSON (base de datos ligera)
│   ├── domains.json            # Dominios y entidades
│   ├── security.json           # Credenciales de acceso
│   ├── logs.json               # Audit trail
│   ├── users.json              # Usuarios de la plataforma
│   ├── templates.json          # Catálogo de templates
│   └── generations.json        # Historial de generaciones
├── src/
│   ├── app.module.ts           # Módulo raíz
│   ├── main.ts                 # Bootstrap + Swagger
│   ├── auth/                   # Autenticación básica
│   ├── users/                  # CRUD de usuarios
│   ├── datasource/             # CRUD + introspección de BD
│   ├── domains/                # CRUD de dominios y entidades
│   ├── generator/              # Motor de generación de código
│   ├── generation-config/      # Configuraciones avanzadas
│   ├── generations/            # Historial de generaciones
│   ├── templates/              # Catálogo de templates
│   └── logs/                   # Audit trail con filtros
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Diagrama de arquitectura — C4 Model

### Nivel 1 — Contexto del sistema

```mermaid
C4Context
  title Jarvis Server — Contexto del sistema

  Person(dev, "Desarrollador", "Equipo de desarrollo de Clínica San Felipe")
  Person(admin, "Administrador", "Gestiona usuarios, templates y configuraciones")

  System(server, "Jarvis Server", "API REST NestJS — motor de generación de microservicios y gestión de la plataforma")

  System_Ext(ui, "Jarvis UI", "Portal web React que consume la API")
  System_Ext(db, "Base de datos clínica", "PostgreSQL / MySQL con esquemas FHIR")
  System_Ext(git, "Repositorio Git", "GitHub / GitLab para push del código generado")

  Rel(dev, ui, "Usa el portal web", "HTTPS")
  Rel(ui, server, "Llama a la API REST", "HTTP / JSON")
  Rel(server, db, "Introspección de esquema", "TCP")
  Rel(server, git, "Push del código generado (opcional)", "HTTPS")
```

---

### Nivel 2 — Contenedores

```mermaid
C4Container
  title Jarvis Server — Contenedores

  Person(dev, "Desarrollador / Admin", "Usuario de la plataforma")

  Container(ui, "Jarvis UI", "React 19 + Vite 8", "Portal web. Puerto 5173")
  Container(server, "Jarvis Server", "NestJS 11 + TypeScript", "API REST. Puerto 3000")
  ContainerDb(config, "config/*.json", "File System (JSON)", "Persistencia ligera: dominios, usuarios, logs, generaciones, templates")

  System_Ext(db, "Base de datos clínica", "PostgreSQL / MySQL")
  System_Ext(git, "Repositorio Git", "GitHub / GitLab")

  Rel(dev, ui, "Usa", "HTTPS / Browser")
  Rel(ui, server, "Llama a la API", "HTTP REST / JSON")
  Rel(server, config, "Lee y escribe", "fs / JSON")
  Rel(server, db, "Introspección de tablas y columnas", "TCP")
  Rel(server, git, "Push del código generado", "HTTPS (opcional)")
```

---

### Nivel 3 — Componentes

```mermaid
C4Component
  title Jarvis Server — Componentes NestJS

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

## Manual técnico — Módulos

### `auth`
Autenticación simple contra `config/security.json`.  
- `POST /auth/login` — recibe `{ username, password }`, retorna `{ token, user }`.  
- El token se adjunta como `Authorization: Bearer <token>` en cada request.

### `users`
CRUD de usuarios de la plataforma.  
- `GET /users` — lista todos los usuarios.  
- `POST /users` — crea usuario con rol `ADMIN` o `DEV`.  
- `PATCH /users/:id` — edita nombre, rol o estado activo/inactivo.  
- `DELETE /users/:id` — elimina usuario.  
- Persiste en `config/users.json`.

### `datasource`
CRUD de conexiones a bases de datos con introspección.  
- `GET /datasources` — lista datasources.  
- `POST /datasources` — registra nueva conexión.  
- `PATCH /datasources/:id` — actualiza.  
- `DELETE /datasources/:id` — elimina.  
- `GET /datasources/:id/tables` — conecta en tiempo real y retorna las tablas del schema `public`.  
- `GET /datasources/:id/tables/:table/columns` — retorna columnas de una tabla.

### `domains`
CRUD de dominios clínicos con entidades tipadas.  
- `GET /domains` — lista dominios.  
- `POST /domains` — crea dominio con entidades y campos tipados (`string`, `number`, `boolean`, `Date`).  
- `PATCH /domains/:id` — actualiza.  
- `DELETE /domains/:id` — elimina.  
- Migración automática de formato legacy (`entities: string[]` → `DomainEntity[]`).

### `generator`
Motor principal de generación de código.  
- `POST /generate` — recibe `GenerateDto`, genera el microservicio y retorna un ZIP.  
- Estrategias:
  - `UX` → genera solo `openapi.yaml` (API First).
  - `CN` / `BS` → genera microservicio NestJS completo con arquitectura hexagonal/clean/layered + Dockerfile + .env + README.
- Registra la generación en `config/generations.json`.
- Cabecera de respuesta: `x-generation-id`.

### `generation-config`
Configuraciones avanzadas reutilizables para generaciones.  
- `GET /generation-config` — lista configuraciones.  
- `POST /generation-config` — crea configuración (arquitectura, ORM, auth, observabilidad, Git).  
- `PATCH /generation-config/:id` — actualiza.  
- `DELETE /generation-config/:id` — elimina.

### `generations`
Historial de todas las generaciones realizadas.  
- `GET /generations` — lista historial.  
- `GET /generations/:id/download` — re-descarga el ZIP de una generación anterior.  
- `DELETE /generations/:id` — elimina registro.

### `templates`
Catálogo de templates disponibles para generación.  
- `GET /templates` — lista templates.  
- `POST /templates` — registra template (nombre, tipo, versión, path).  
- `PATCH /templates/:id` — actualiza.  
- `DELETE /templates/:id` — elimina.

### `logs`
Audit trail de todas las operaciones de la plataforma.  
- `GET /logs` — lista logs con filtros opcionales: `?user=&module=&level=&from=&to=`.  
- `DELETE /logs` — limpia el log completo.  
- Niveles: `INFO`, `WARN`, `ERROR`.

---

## Endpoints resumen

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Login |
| GET/POST/PATCH/DELETE | `/users` | CRUD usuarios |
| GET/POST/PATCH/DELETE | `/datasources` | CRUD datasources |
| GET | `/datasources/:id/tables` | Introspección tablas |
| GET/POST/PATCH/DELETE | `/domains` | CRUD dominios |
| POST | `/generate` | Generar microservicio ZIP |
| GET/POST/PATCH/DELETE | `/generation-config` | CRUD configs avanzadas |
| GET | `/generations` | Historial generaciones |
| GET | `/generations/:id/download` | Re-descarga ZIP |
| GET/POST/PATCH/DELETE | `/templates` | CRUD templates |
| GET | `/logs` | Consulta audit trail |

---

## Variables de entorno

El servidor no requiere `.env` para funcionar en desarrollo. Para producción se recomienda:

```env
PORT=3000
NODE_ENV=production
```

---

## Credenciales por defecto

Definidas en `config/security.json`:

```
usuario: admin
password: admin123
```

---

## Dominios sugeridos según HL7 FHIR R4

| Dominio FHIR | Entidades principales | Tipo sugerido |
|---|---|---|
| **Patient** | Patient, RelatedPerson, Person | BS |
| **Encounter** | Encounter, EpisodeOfCare | BS |
| **Observation** | Observation, DiagnosticReport | BS |
| **Medication** | Medication, MedicationRequest, MedicationAdministration | BS |
| **Appointment** | Appointment, Schedule, Slot | CN |
| **Practitioner** | Practitioner, PractitionerRole | BS |
| **Organization** | Organization, Location, HealthcareService | BS |
| **Claim** | Claim, ClaimResponse, Coverage | BS |
| **DocumentReference** | DocumentReference, Composition | UX |
| **ImagingStudy** | ImagingStudy, ImagingSelection | UX |
| **AllergyIntolerance** | AllergyIntolerance, Condition | BS |
| **Procedure** | Procedure, ServiceRequest | BS |

> Referencia: [HL7 FHIR R4](https://hl7.org/fhir/R4/resourcelist.html)

---

## Flujo de uso

```
1. Login (admin/admin123)
        │
        ▼
2. Crear DataSource (conexión BD)
        │
        ▼
3. Crear Dominio + Entidades (ej: Patient con campos tipados)
        │
        ▼
4. Initialize → Wizard 5 pasos
   ├── Paso 1: Nombre + Tipo (UX/CN/BS) + Dominio
   ├── Paso 2: Arquitectura + ORM + Auth + Observabilidad + Git
   ├── Paso 3: DataSource + tablas disponibles
   ├── Paso 4: Preview de configuración
   └── Paso 5: Generar → descarga ZIP
        │
        ▼
5. Consultar Generations (historial + re-descarga)
        │
        ▼
6. Revisar Logs (audit trail)
```
