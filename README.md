# Clinic AI Copilot

Clinic AI Copilot is a doctor-facing clinic workspace for managing patients,
appointments, clinical notes, and doctor-reviewed AI summaries. It is built as a
JavaScript monorepo with a React/Vite frontend, an Express API, MongoDB Atlas
storage, JWT authentication, and local Ollama support for AI summary generation.

The product idea is intentionally narrow: the doctor writes the clinical note
normally, then asks AI to draft a structured summary. The AI draft is never final
by itself. The doctor must accept, edit, regenerate, or reject it before it is
treated as reviewed.

## Current Status

Stage 10 is complete for staging:

- Local Docker Compose is validated.
- Render staging is live.
- The staging API and web app were smoke-tested end to end.
- Production hardening, CI/CD, custom domains, and cloud AI hosting are still
  pending.

Live staging:

```text
https://clinic-ai-copilot-web-staging.onrender.com
https://clinic-ai-copilot-api-staging.onrender.com/api/health
```

AI summaries work locally when Ollama is running. On Render staging, AI summaries
require `OLLAMA_URL` to point to a cloud-reachable Ollama server. Localhost
Ollama does not work from Render.

## Core Workflow

1. A doctor signs in.
2. The dashboard shows patients and today's appointments.
3. The doctor opens a patient or appointment.
4. The doctor can create/edit/archive patients and schedule/edit/archive visits.
5. The doctor writes a clinical note for a visit or patient.
6. The doctor can generate an AI draft summary after the note exists.
7. The AI draft shows short summary, key symptoms, assessment, and plan.
8. The doctor accepts, edits, regenerates, or rejects the draft.
9. Accepted/edited summaries are saved as doctor-reviewed output.
10. Audit logs record important actions.

## Implemented Features

- Provider signup, login, session persistence, and sign out
- JWT-protected API routes
- Doctor-scoped data isolation
- Patient list, detail, create, edit, and archive
- Appointment scheduling, status updates, visit history, and archive behavior
- Clinical notes linked to patients or visits
- Patient timeline combining visits and notes
- MongoDB text search over active notes
- Audit log viewer
- Backend-owned visit status enum exposed through `GET /api/statuses`
- Patient directory status and last visit date computed from appointment records
- Doctor-reviewed AI summary workflow backed by Ollama
- Pagination for patients, appointments, notes, note search, timeline, and audit
  logs
- Soft archive behavior for patients, appointments, and notes
- Local Docker Compose setup for API/web containers
- Render staging deployment through `render.yaml`

## Not Yet Implemented

- Cloud-hosted AI summaries for staging
- Semantic/vector search
- Forgot/reset password flow
- Full role-based access control beyond the doctor role
- Login/register rate limiting
- httpOnly cookie session strategy
- CI/CD pipeline
- Production deployment with custom domains and production secrets

## Tech Stack

- Package manager: Yarn 4 workspaces
- Frontend: React, Vite, JavaScript
- Backend: Node.js, Express, JavaScript
- Database: MongoDB Atlas with Mongoose
- Auth: JWT and bcrypt password hashing
- AI: Ollama-compatible local provider, default model `llama3.1:8b`
- Styling/assets: app-local CSS and CliniKit visual assets
- Local containers: Docker Compose
- Staging host: Render

## Repository Structure

```text
apps/
  web/                       React/Vite frontend
services/
  api/                       Express API, auth, models, seed script
packages/
  shared/                    Reserved workspace package for future shared code
infra/
  docker/                    Dockerfiles, Nginx config, Docker usage notes
  deployment/                Render and deployment notes
docs/                        Project plan and implementation roadmap
```

Important files:

- `render.yaml` - Render Blueprint for staging API/web services
- `docker-compose.yml` - local container orchestration
- `.env.example` - required environment variable template
- `docs/PROJECT_PLAN.md` - staged roadmap and system decisions
- `infra/deployment/render.md` - Render staging setup and operations

## Data Model

Every clinical record is scoped to a `doctorId`.

- `Doctor` - name, email, password hash
- `Patient` - demographics, contact, active/archive state
- `Appointment` - scheduled date/time, reason, status, patient link
- `Note` - clinical note text, patient link, optional appointment link
- `AiSummary` - draft/reviewed summary sections tied to a note
- `AuditLog` - key actions for traceability

`noteCount`, current patient status, and last visit date are computed by the API.
They are not manually editable fields in the frontend.

## API Overview

Public routes:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`

Authenticated routes:

- `GET /api/auth/me`
- `GET /api/statuses`
- `GET /api/patients`
- `GET /api/patients/:id`
- `POST /api/patients`
- `PATCH /api/patients/:id`
- `DELETE /api/patients/:id`
- `GET /api/appointments`
- `POST /api/appointments`
- `PATCH /api/appointments/:id`
- `DELETE /api/appointments/:id`
- `GET /api/notes`
- `GET /api/notes/search`
- `POST /api/notes`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`
- `GET /api/notes/:id/summary`
- `POST /api/notes/:id/summarize`
- `PATCH /api/summaries/:id`
- `GET /api/audit-logs`
- `GET /api/patients/:id/timeline`

Paginated list endpoints accept `page` and `limit` query parameters. The
frontend hides pagination controls when a list is empty or has one page.

## Environment Setup

Create a local `.env` from `.env.example` and fill in real values before
starting the API.

Required API values:

```env
NODE_ENV=development
MONGO_URL=your_mongodb_atlas_connection_string
JWT_SECRET=your_local_secret
CORS_ORIGINS=http://localhost:3000
DEMO_DOCTOR_EMAIL=doctor@clinikit.local
DEMO_DOCTOR_NAME=Demo Doctor
DEMO_DOCTOR_PASSWORD=replace_with_demo_password
```

Frontend:

```env
VITE_API_BASE_URL=http://localhost:3001
```

AI:

```env
OLLAMA_URL=http://localhost:11434
DOCKER_OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=45000
```

Local development falls back to `http://localhost:3001` when
`VITE_API_BASE_URL` is not set. Production builds require `VITE_API_BASE_URL`.

## Local Development

Install dependencies:

```bash
yarn install
```

Seed MongoDB Atlas after `.env` is configured:

```bash
yarn api:seed
```

Start the API:

```bash
yarn api:dev
```

Start the web app in another terminal:

```bash
yarn web:dev
```

Open:

```text
http://localhost:3000
```

For AI summaries, start Ollama separately and install the configured model:

```bash
ollama pull llama3.1:8b
ollama serve
```

## Docker

The Docker setup uses the same root `.env` file.

Start API and web containers:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Seed MongoDB Atlas through Docker when needed:

```bash
docker compose run --rm api yarn api:seed
```

When using Ollama from Docker, keep Ollama running on the host and use:

```env
DOCKER_OLLAMA_URL=http://host.docker.internal:11434
```

If local dev servers already use ports `3000` and `3001`, run Docker on
alternate host ports:

```bash
API_PORT=3101 WEB_PORT=3100 VITE_API_BASE_URL=http://localhost:3101 CORS_ORIGINS=http://localhost:3100 docker compose up --build
```

## Render Staging

Render staging is managed by the root `render.yaml` Blueprint.

Current staging services:

```text
clinic-ai-copilot-api-staging
clinic-ai-copilot-web-staging
```

See `infra/deployment/render.md` for setup, seeding, URL checks, and staging
smoke testing.

## Useful Scripts

```bash
yarn web:dev
yarn api:dev
yarn api:seed
yarn web:lint
yarn api:lint
yarn lint
yarn web:build
yarn docker:build
yarn docker:up
yarn docker:down
yarn format
yarn format:check
```

## Security And Data Notes

- Do not commit `.env` files or real secrets.
- Staging should use demo data only.
- Every patient, appointment, note, AI summary, and audit log is scoped to the
  authenticated doctor.
- Patient, appointment, and note deletes use archive behavior instead of hard
  deletion.
- CORS must list only known frontend origins.
- `JWT_SECRET` is required at API startup.
- AI summaries should not be used with real patient data until privacy,
  compliance, retention, and provider terms are reviewed.

## Known Limitations

- Render staging does not currently have cloud AI connected.
- The demo doctor is created by the seed script; new doctor accounts start with
  empty data by design.
- Duplicate patient handling is basic.
- Auth is suitable for development/staging but not yet production-hardened.
- Forgot/reset password is not implemented.
- Semantic search is not implemented.
- No CI/CD pipeline is configured yet.

## Recommended Next Steps

1. Decide the AI provider strategy for staging.
2. Add production auth hardening: rate limiting, password reset, and safer
   session handling.
3. Add CI checks before Render auto-deploys.
4. Prepare production environment values and custom domains.
5. Add semantic search only after the core clinical workflow is stable.
