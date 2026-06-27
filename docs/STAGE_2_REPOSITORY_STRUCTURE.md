# Stage 2 Repository Structure

## Goal

Create a clean monorepo that separates the frontend, the backend API, shared packages, infrastructure, and documentation. The whole project uses JavaScript only (no TypeScript) and targets a single role: the doctor.

## Created Structure

```text
apps/web
services/api
packages/shared
infra/docker
infra/deployment
docs
```

## Baseline Files

- `README.md`: project overview, architecture, stack, local setup, and repository map.
- `.env.example`: safe environment variable template with placeholder values only.
- `.gitignore`: excludes dependencies, build outputs, local secrets, logs, and local tool metadata.
- `.editorconfig`: shared editor formatting defaults.
- `.prettierrc.json`: Prettier formatting rules.
- `.prettierignore`: files and folders excluded from formatting.
- `package.json`: Yarn workspace configuration and root scripts.
- `.yarnrc.yml`: Yarn configuration using `node_modules` linking for simpler trainee onboarding.
- `.vscode/extensions.json`: recommended VS Code extensions.
- `.vscode/settings.json`: workspace formatting defaults.

## Checkpoint

Can another developer understand the repository in five minutes?

Yes. The README describes the product, architecture, folder responsibilities, stack, local setup checks, and current limitations.
