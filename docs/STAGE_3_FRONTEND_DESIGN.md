# Stage 3 Frontend Design Slice

## Goal

Create the first real frontend design for Clinic AI Copilot before wiring backend APIs.

## Current Design Direction

The frontend is now a simple staff dashboard inspired by the CliniKit visual theme without copying the public website structure. It keeps the dark navy, cyan accent, compact brand mark, and clinical-tech atmosphere, but the content focuses on the guide's first working slice: patients, appointments, notes, system status, and human-reviewed AI.

## Implemented Screens

- Staff workspace header
- System status panel for web app, health API, and mock data
- Patient list using mock data
- Medical note flow card
- Human-reviewed AI queue
- Project module cards for patient, appointment, notes, and AI services

## Mock Data

The dashboard currently uses static mock data in:

```text
apps/web/src/app/page.tsx
```

This is intentional. The backend health API and real service integration will come after the visual direction is approved.

## Run Command

```powershell
yarn web:dev
```

Open:

```text
http://localhost:3000
```

## Verification

Passed:

- `yarn format:check`
- `yarn web:lint`
- `yarn web:build`
- Browser response check at `http://localhost:3000`
- Desktop and mobile screenshot review

## Next Decisions

Before connecting the backend, review whether the frontend should keep this layout or change any of:

- Patient list fields
- System status wording
- Notes and AI review cards
- Color/style direction
- Mobile layout behavior
