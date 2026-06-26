# Stage 3 Frontend Design Slice

## Goal

Create the first real frontend design for Clinic AI Copilot before wiring backend APIs.

## Current Design Direction

The frontend is an operations-focused clinic dashboard, not a marketing landing page. It prioritizes fast scanning, patient flow, AI review status, and audit visibility.

## Implemented Screens

- Care team command center dashboard
- Left navigation for main clinic modules
- Metrics for appointments, check-ins, AI drafts, and safety reviews
- Patient queue with status and acuity
- AI review queue with draft/context/audit items
- Human-reviewed AI summary flow
- Live audit timeline

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

Before connecting the backend, review whether the dashboard should keep this layout or change any of:

- Navigation modules
- Dashboard metrics
- Patient queue columns
- AI review panel content
- Color/style direction
- Mobile layout behavior
