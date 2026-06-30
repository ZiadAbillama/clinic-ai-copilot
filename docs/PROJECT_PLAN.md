# Clinic AI Copilot - Project Plan

Single source of truth for scope, decisions, and status.
Legend: Completed / Partial / Planned

## 1. Product

Clinic AI Copilot is a simplified AI-assisted clinic workspace for doctors. Each
doctor manages their own patients, visits, and medical notes, and can use a local
AI model to draft note summaries that the doctor must review before they count.

Core workflow: doctor opens today's appointment -> reviews patient and visit
context -> writes the clinical note normally -> asks AI to draft a summary only
after the note exists -> doctor accepts, edits, regenerates, or rejects -> final
reviewed summary is saved with the original doctor note.

## 2. Final Stack Decisions

| Area     | Decision                                                             | Status    |
| -------- | -------------------------------------------------------------------- | --------- |
| Language | JavaScript only (no TypeScript)                                      | Completed |
| Frontend | React with Vite                                                      | Completed |
| Backend  | Node.js with Express (single API service)                            | Completed |
| Database | MongoDB only, via Mongoose (no PostgreSQL)                           | Completed |
| AI       | Local Ollama server, model `llama3.1:8b` at `http://localhost:11434` | Completed |
| Auth     | Multiple doctors, isolated data, real JWT                            | Completed |
| Search   | MongoDB text search (semantic later)                                 | Planned   |
| Infra    | Docker Compose (later)                                               | Planned   |
| Tooling  | Yarn workspaces, ESLint, Prettier                                    | Completed |

## 3. Roles & Data Isolation

- One role: **doctor**. Many doctor accounts.
- Every record is owned by a `doctorId`. Every query is scoped to the
  authenticated doctor, so doctors never see each other's data.

## 4. Features

| #   | Feature               | Summary                                                      | Status    |
| --- | --------------------- | ------------------------------------------------------------ | --------- |
| 1   | Doctor dashboard      | Today's appointments with patient/status/open appointment    | Partial   |
| 2   | Patient management    | List / open / create / edit / archive patients               | Completed |
| 3   | Appointments (visits) | Patient visit history, scheduling, editing, archive behavior | Completed |
| 4   | Medical notes         | Attached to a visit or standalone on a patient               | Completed |
| 5   | Patient timeline      | Merged visits + notes, newest-first                          | Completed |
| 6   | AI summarization      | Local Ollama drafts a note summary after doctor note exists  | Completed |
| 7   | AI review             | Draft -> Approved / Rejected; only Approved counts           | Completed |
| 8   | Note search           | MongoDB text search over notes                               | Planned   |
| 9   | Audit log             | Record key doctor actions                                    | Partial   |
| 10  | Auth                  | Multiple doctors, isolated data, JWT                         | Completed |

### Feature detail notes

- **Dashboard (Partial):** UI shell, live `/api/health` status, today's
  appointment list, patient information, visit status, and an `Open appointment`
  action exist. The list depends on appointments dated today.
- **Patient management (Completed):** list/get/create/edit/archive exists for each
  authenticated doctor, backed by MongoDB Atlas.
- **Appointments (Completed):** appointment model, patient visit history,
  schedule/edit/archive controls, and patient-linked visit display exist.
- **Database (Completed):** Mongoose connection and model layer exist for Doctor,
  Patient, Appointment, Note, AiSummary, and AuditLog.
- **Medical notes (Completed):** notes can be created, edited, archived, and linked
  to a visit or saved as standalone patient notes.
- **Patient timeline (Completed):** timeline API and UI merge visits + notes,
  newest-first.
- **Audit log (Partial):** AuditLog model exists and patient, appointment, note,
  and AI summary review actions are recorded. A full audit viewer is not built
  yet.
- **Auth (Completed):** doctors can register/login with JWT. Patient,
  appointment, note, timeline, and audit routes are scoped to the authenticated
  doctor. The seed script creates a demo doctor for existing starter data.
- **Visit statuses:** `Scheduled` -> `Checked in` -> `Needs vitals` ->
  `Doctor review` -> `Completed` -> `Cancelled`.
- **Notes:** a note may link to a visit (`appointmentId`) or be standalone
  (`appointmentId = null`).
- **Appointment workspace:** opening an appointment shows patient context at the
  top, visit reason, a previous visits action, and a clinical note textarea. AI
  summary generation/review appears only after a doctor note exists.
- **AI review:** an AI summary is `draft` until the doctor accepts/edits it into
  a reviewed summary or rejects it. The original doctor note remains saved
  separately from the AI-generated draft. Editing the original note invalidates
  prior summaries.

## 5. Data Model (MongoDB / Mongoose)

Every collection is owned by `doctorId`.

- **Doctor** - name, email, passwordHash
- **Patient** - doctorId, name, dob, contact, visit summary fields, noteCount,
  archivedAt
- **Appointment (Visit)** - doctorId, patientId, scheduledDate, scheduledTime,
  reason, status, archivedAt
- **Note** - doctorId, patientId, appointmentId (nullable = standalone), text,
  archivedAt
- **AiSummary** - doctorId, noteId, text, shortSummary, keySymptoms, assessment,
  plan, status (`draft`/`approved`/`rejected`), reviewedAt
- **AuditLog** - doctorId, action, targetType, targetId, timestamp

**Timeline:** for one patient, merge that patient's Appointments + Notes (scoped
to the doctor) and sort newest-first.

## 6. API Surface

Current (JWT-protected unless noted):

- `GET /api/health` - service status
- `POST /api/auth/register` - create a doctor account and return a JWT
- `POST /api/auth/login` - sign in a doctor and return a JWT
- `GET /api/auth/me` - return the authenticated doctor
- `GET /api/patients` - list this doctor's active patients from MongoDB Atlas
- `GET /api/patients/:id` - single active patient scoped to this doctor
- `POST /api/patients` - create a patient for this doctor
- `PATCH /api/patients/:id` - update this doctor's patient
- `DELETE /api/patients/:id` - archive this doctor's patient and child records
- `GET /api/appointments` - visits with patient data from MongoDB Atlas
- `POST /api/appointments` - create a visit for a patient
- `PATCH /api/appointments/:id` - update a visit
- `DELETE /api/appointments/:id` - archive a visit
- `GET /api/notes` - list notes, optionally filtered by patient or visit
- `POST /api/notes` - create a standalone or visit-linked note
- `PATCH /api/notes/:id` - update a note
- `DELETE /api/notes/:id` - archive a note
- `GET /api/notes/:id/summary` - latest non-rejected AI summary for a note
- `POST /api/notes/:id/summarize` - generate an Ollama draft summary
- `PATCH /api/summaries/:id` - approve/reject an AI summary
- `GET /api/patients/:id/timeline` - merged visits + notes for one patient

Planned:

- `GET /api/notes/search?q=` - text search over notes
- Audit log viewer

## 7. Build Roadmap

| Stage | Focus                                       | Status    |
| ----- | ------------------------------------------- | --------- |
| 0     | Domain summary                              | Completed |
| 1     | Environment check                           | Completed |
| 2     | Repository structure (monorepo, JS-only)    | Completed |
| 3     | Frontend design slice + health/patients API | Completed |
| 4     | MongoDB + Mongoose models                   | Completed |
| 5     | Auth (JWT, multi-doctor, data isolation)    | Completed |
| 6     | Patients + visits + notes CRUD              | Completed |
| 7     | Patient timeline                            | Completed |
| 8     | AI summarization (Ollama) + review workflow | Completed |
| 9     | Note search + audit log                     | Planned   |
| 10    | Dockerize + deployment                      | Planned   |

## 8. Known Limitations (current)

- Patient data uses MongoDB Atlas, seeded from starter data.
- Patient create/edit/archive exists, but richer duplicate handling is still basic.
- The demo doctor account is created by `yarn api:seed`; new doctor accounts start
  with empty patient data by design.
- Appointment persistence, patient visit history, scheduling/editing, and archive
  behavior exist.
- Ollama must be running locally and the configured model must be installed for
  AI draft generation to work.
- Note search and the full audit viewer are not built yet.
