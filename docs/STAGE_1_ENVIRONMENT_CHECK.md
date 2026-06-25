# Stage 1 Environment Check

## Goal

Confirm that the development machine is ready for full-stack, containerized development for Clinic AI Copilot.

## Tool Verification

| Check                 | Command                  | Status           | Result                |
| --------------------- | ------------------------ | ---------------- | --------------------- |
| Node.js               | `node -v`                | Passed           | `v24.16.0`            |
| npm                   | `npm -v`                 | Passed           | `11.13.0`             |
| Yarn through Corepack | `corepack yarn -v`       | Passed           | `4.17.0`              |
| Plain Yarn command    | `yarn -v`                | Passed           | `4.17.0`              |
| Git                   | `git --version`          | Passed           | `2.54.0.windows.1`    |
| Docker CLI            | `docker --version`       | Passed           | `28.5.2`              |
| Docker Compose        | `docker compose version` | Passed           | `v2.40.3-desktop.1`   |
| Docker engine         | `docker info`            | Passed           | `28.5.2`              |
| VS Code               | `code --version`         | Passed           | `1.126.0`             |
| PostgreSQL CLI        | `psql --version`         | Optional missing | `psql` is not on PATH |
| MongoDB Shell         | `mongosh --version`      | Passed           | `2.5.9`               |

## VS Code Extensions Confirmed

- Docker / Containers: installed.
- ESLint: installed.
- Prettier: installed.
- PostgreSQL tooling: installed through SQLTools and PostgreSQL driver.
- MongoDB tooling: installed.
- REST Client: installed.

## Current Gaps

### SSH Keys

An SSH keypair exists at:

- `C:\Users\ziada\.ssh\id_ed25519`
- `C:\Users\ziada\.ssh\id_ed25519.pub`

Next, add the public key to the Git provider account before pushing to GitHub, GitLab, or a company Git server.

### PostgreSQL Client

The `psql` command-line client is not installed or not on PATH. This is optional for now because VS Code PostgreSQL tooling is installed, and the project can later run PostgreSQL through Docker.

If a local CLI is desired, install PostgreSQL client tools and verify:

```powershell
psql --version
```

## Stage 1 Status

The machine is mostly ready for Stage 2 repository setup.

Ready:

- Node.js and npm
- Git
- Yarn
- Docker CLI and Docker Compose
- VS Code
- MongoDB shell
- Required VS Code extensions

Remaining manual action:

- Add the SSH public key to the Git provider account before using remote repositories.

## Checkpoint

Can we clone, run, edit, and commit a basic project?

Yes for local development. The machine can run the expected local tools, edit code, and use Docker. Remote Git access will be complete after the SSH public key is added to the Git provider account.
