# Clinic AI Copilot — Project Plan

Single source of truth for scope, decisions, and status.
Legend: ✅ Completed · 🟡 Partial · ⬜ Planned

## 1. Product

Clinic AI Copilot is a simplified AI-assisted clinic workspace for doctors. Each
doctor manages their own patients, visits, and medical notes, and uses a local AI
model to draft note summaries that the doctor must review before they count.

Core workflow: open/schedule a visit → add notes → AI drafts a summary → doctor
approves or rejects → everything appears on the patient timeline.

## 2. Final Stack Decisions

| Area     | Decision                                                             | Status |
| -------- | -------------------------------------------------------------------- | ------ |
| Language | JavaScript only (no TypeScript)                                      | ✅     |
| Frontend | React with Vite                                                      | ✅     |
| Backend  | Node.js with Express (single API service)                            | ✅     |
| Database | MongoDB only, via Mongoose (no PostgreSQL)                           | 🟡     |
| AI       | Local Ollama server, model `llama3.1:8b` at `http://localhost:11434` | ⬜     |
| Auth     | Multiple doctors, isolated data, real JWT                            | ⬜     |
| Search   | MongoDB text search (semantic later)                                 | ⬜     |
| Infra    | Docker Compose (later)                                               | ⬜     |
| Tooling  | Yarn workspaces, ESLint, Prettier                                    | ✅     |

## 3. Roles & Data Isolation

- One role: **doctor**. Many doctor accounts.
- Every record is owned by a `doctorId`. Every query is scoped to the authenticated
  doctor, so doctors never see each other's data.

## 4. Features

| #   | Feature               | Summary                                                        | Status |
| --- | --------------------- | -------------------------------------------------------------- | ------ |
| 1   | Doctor dashboard      | Home: this doctor's patients, today's visits, AI/system status | 🟡     |
| 2   | Patient management    | List / open / create / edit patients                           | 🟡     |
| 3   | Appointments (visits) | Start now or schedule; status set below                        | ⬜     |
| 4   | Medical notes         | Attached to a visit **or standalone** on a patient             | ⬜     |
| 5   | Patient timeline      | Merged visits + notes, newest-first                            | ⬜     |
| 6   | AI summarization      | Local Ollama drafts a note summary                             | ⬜     |
| 7   | AI review             | Draft → Approved / Rejected; only Approved counts              | ⬜     |
| 8   | Note search           | MongoDB text search over notes                                 | ⬜     |
| 9   | Audit log             | Record key doctor actions                                      | ⬜     |
| 10  | Auth                  | Multiple doctors, isolated data, JWT                           | ⬜     |

### Feature detail notes

- **Dashboard (🟡):** UI shell + live `/api/health` status done; patient list now
  loads through `/api/patients`.
- **Patient management (🟡):** read-only mock list/get endpoints exist and the
  dashboard consumes the list and detail endpoints; create/edit and persistence are
  not built.
- **Database (🟡):** Mongoose connection and Patient model exist; the API reads
  patients from MongoDB Atlas. Other models are not built yet.
- **Visit statuses:** `Scheduled` → `In progress` → `Completed` → `Cancelled`.
  "Start now" creates the visit directly as `In progress`; "Schedule" creates it as
  `Scheduled`.
- **Notes:** a note may link to a visit (`appointmentId`) or be standalone
  (`appointmentId = null`).
- **AI review:** an AI summary is `draft` until the doctor sets it `approved` or
  `rejected`. Only `approved` summaries are treated as part of the record.

## 5. Data Model (MongoDB / Mongoose)

Every collection is owned by `doctorId`.

- **Doctor** — name, email, passwordHash
- **Patient** — doctorId, name, dob, contact
- **Appointment (Visit)** — doctorId, patientId, scheduledAt, reason, status
- **Note** — doctorId, patientId, appointmentId (nullable = standalone), text, createdAt
- **AiSummary** — doctorId, noteId, text, status (`draft`/`approved`/`rejected`), reviewedAt
- **AuditLog** — doctorId, action, targetType, targetId, timestamp

**Timeline:** for one patient, merge that patient's Appointments + Notes (scoped to
the doctor) and sort newest-first; show each note's AI summary inline.

## 6. API Surface

Current (✅):

- `GET /api/health` — service status
- `GET /api/patients` — list from MongoDB Atlas
- `GET /api/patients/:id` — single from MongoDB Atlas

Planned (⬜, all JWT-protected and doctor-scoped):

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET/POST/PATCH /api/patients`, `GET /api/patients/:id`
- `GET/POST/PATCH /api/appointments` (visits)
- `GET/POST/PATCH /api/notes` (visit-linked or standalone)
- `GET /api/patients/:id/timeline`
- `POST /api/notes/:id/summarize` (Ollama) and `PATCH /api/summaries/:id` (approve/reject)
- `GET /api/notes/search?q=`
- Audit log written on key actions

## 7. Build Roadmap

| Stage | Focus                                       | Status |
| ----- | ------------------------------------------- | ------ |
| 0     | Domain summary                              | ✅     |
| 1     | Environment check                           | ✅     |
| 2     | Repository structure (monorepo, JS-only)    | ✅     |
| 3     | Frontend design slice + health/patients API | ✅     |
| 4     | MongoDB + Mongoose models                   | 🟡     |
| 5     | Auth (JWT, multi-doctor, data isolation)    | ⬜     |
| 6     | Patients + visits + notes CRUD              | ⬜     |
| 7     | Patient timeline                            | ⬜     |
| 8     | AI summarization (Ollama) + review workflow | ⬜     |
| 9     | Note search + audit log                     | ⬜     |
| 10    | Dockerize + deployment                      | ⬜     |

## 8. Known Limitations (current)

- Patient data uses MongoDB Atlas, seeded from starter data.
- No auth; the API is unscoped and public.
- No appointments, notes, timeline, AI, search, or audit log persistence yet.
