# Stage 3 Frontend Design Slice

## Goal

Create the first real frontend design for Clinic AI Copilot before wiring backend APIs.

## Current Design Direction

The frontend is a simple doctor dashboard inspired by the CliniKit visual theme without copying the public website structure. It keeps the dark navy, cyan accent, compact brand mark, and clinical-tech atmosphere, but the content focuses on the guide's first working slice: patients, notes, system status, and human-reviewed AI for a single doctor.

## Implemented Screens

- Doctor workspace header
- System status panel for web app, Express health API, and mock data
- Patient list using mock data
- Medical note flow card
- Human-reviewed AI queue
- Module cards for patients, appointments, notes, and AI assistant

## Mock Data

The dashboard uses static mock data in:

```text
apps/web/src/App.jsx
```

The health status is read live from the Express API at `/api/health` (proxied by Vite). Real patient and note integration will come in later stages.

## Run Command

Start the API:

```bash
yarn api:dev
```

Start the web app:

```bash
yarn web:dev
```

Open:

```text
http://localhost:3000
```

## Verification

Passed:

- `yarn format:check`
- `yarn lint`
- `yarn web:build`
- Express `/api/health` and `/api/patients` respond
- Browser response check at `http://localhost:3000`

## Next Decisions

Before connecting the backend, review whether the frontend should keep this layout or change any of:

- Patient list fields
- System status wording
- Notes and AI review cards
- Color/style direction
- Mobile layout behavior
