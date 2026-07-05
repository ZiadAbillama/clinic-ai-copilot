# Clinic AI Copilot

Clinic AI Copilot is a doctor-facing clinic workspace built as a staged training project. The current app focuses on secure provider access, appointment scheduling, patient records, visits, notes, patient timelines, note search, audit history, and doctor-reviewed AI summaries backed by MongoDB Atlas.

## Current Stage

Current stage: Stage 10 in progress - Docker Compose and Render staging files are available. Production hardening and CI/CD are still pending.

Implemented:

- React/Vite frontend with the CliniKit-aligned visual direction
- Provider signup, login, session persistence, and sign out
- Express API with JWT-protected clinical endpoints
- MongoDB Atlas storage through Mongoose
- Patient management with soft archive delete behavior
- Appointment scheduling from today's appointment panel and patient visit history
- Visits, notes, and patient timeline views with archive behavior
- Appointment workspace with doctor note entry and AI draft summary review
- Backend-owned visit status list exposed through `GET /api/statuses`
- Patient list status and last visit date computed from appointment records
- MongoDB text search over active notes
- Recent audit log viewer
- Pagination for patients, appointments, visits, notes, timeline, note search, and audit log
- Docker Compose setup for local API/web containers
- Render Blueprint for a staging API/web deployment

Not yet implemented:

- Semantic search
- Production deployment pipeline beyond Render staging
- Full role-based access control beyond the doctor role
- Forgot/reset password flow
- Production auth hardening such as rate limiting and httpOnly cookie sessions

## Stack

- Package manager: Yarn 4 workspaces
- Frontend: React, Vite, JavaScript
- Backend: Node.js, Express, JavaScript
- Database: MongoDB Atlas with Mongoose
- AI: local Ollama, default model `llama3.1:8b`
- Auth: JWT, bcrypt password hashing
- Styling/assets: app-local CSS and CliniKit visual assets

## Repository Structure

```text
apps/
  web/                       React/Vite frontend
services/
  api/                       Express API, auth, MongoDB models, seed script
packages/
  shared/                    Shared workspace package placeholder
infra/
  docker/                    Local infrastructure notes/assets
  deployment/                Deployment notes/assets
docs/                        Project plan and stage notes
```

## Environment Setup

Create a local `.env` from `.env.example` and fill in real values before starting the API.

Required API values:

```env
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

For local development, the frontend falls back to `http://localhost:3001`. Production builds require `VITE_API_BASE_URL`.

## Startup Flow

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

For AI summaries, start Ollama separately and make sure the configured model is installed:

```bash
ollama pull llama3.1:8b
ollama serve
```

Start the web app in a second terminal:

```bash
yarn web:dev
```

Open:

```text
http://localhost:3000
```

## Docker Startup Flow

The Docker setup uses the same root `.env` file. Fill in `.env` first, then run:

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

If local dev servers are already using ports `3000` and `3001`, run Docker on
alternate host ports:

```bash
API_PORT=3101 WEB_PORT=3100 VITE_API_BASE_URL=http://localhost:3101 CORS_ORIGINS=http://localhost:3100 docker compose up --build
```

## Useful Scripts

```bash
yarn web:lint
yarn api:lint
yarn lint
yarn web:build
yarn docker:build
yarn docker:up
yarn docker:down
```

## Notes

- Do not commit real `.env` secrets.
- MongoDB Atlas is the shared development database path for this project.
- Patient delete currently archives patient records and related visits/notes instead of hard-deleting them.
- `noteCount` is calculated from notes by the API and is not editable in the patient form.
- Patient directory status comes from appointment records. `New patient` is a display label only when no visits exist.
- Visit statuses come from the API status endpoint, not a duplicated frontend list.
- AI summaries are drafts until a doctor accepts or rejects them. Editing the original note invalidates prior summaries.
- Ollama must be running locally for AI summary generation.
- See `infra/docker/README.md` for container usage and `infra/deployment/README.md` for deployment notes.
- See `infra/deployment/render.md` for Render staging steps.
