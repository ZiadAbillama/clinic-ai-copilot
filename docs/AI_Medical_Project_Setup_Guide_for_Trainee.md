**AI Medical Software Project Setup Guide**

_Step-by-step technical and logical onboarding for a Computer & Communication Engineering trainee_

| **Project theme**  | AI-assisted clinic workspace for a single doctor                                              |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **Main stack**     | React (Vite), Node.js/Express, JavaScript only, Docker, PostgreSQL, MongoDB, Cloud deployment |
| **Learning style** | Build a small real system incrementally, not isolated exercises                               |
| **Final outcome**  | A runnable, documented, dockerized, cloud-ready AI medical module                             |

# 1\. Purpose of This Guide

This guide helps the trainee start the project logically and technically. The objective is not only to install tools, but to understand why each component exists and how it contributes to an AI-driven medical software platform.

# 2\. Product Concept

The trainee will build a simplified medical workspace called Clinic AI Copilot. The system should help a single doctor manage patients, medical notes, and AI-assisted summaries. The whole project is written in JavaScript only (no TypeScript) to keep it simple.

- Frontend: a React app (built with Vite) for the doctor's dashboard.
- Backend: a single Express API for patients, notes, and AI features.
- SQL database: structured medical/business records such as patients and notes.
- NoSQL database: AI conversations, audit logs, activity history, and unstructured notes.
- AI layer: summarization, semantic search, and assistant-style workflows.
- Deployment: dockerized local environment first, then cloud/staging deployment.

# 3\. Target Architecture

| **Layer**      | **Component**        | **Responsibility**                            |
| -------------- | -------------------- | --------------------------------------------- |
| User Interface | React Web App (Vite) | Doctor dashboard, forms, AI assistant screens |
| API Layer      | Express API          | Routes requests, validation, business logic   |
| SQL Storage    | PostgreSQL           | Reliable structured data and relationships    |
| NoSQL Storage  | MongoDB              | Logs, AI sessions, unstructured records       |
| Infrastructure | Docker + Cloud       | Repeatable environment and deployment         |

# 4\. Logical Build Order

| **Stage** | **Focus**                       | **Reason**                                            |
| --------- | ------------------------------- | ----------------------------------------------------- |
| Stage 0   | Understand the problem          | Know what the system is solving before coding.        |
| Stage 1   | Prepare development environment | Install tools and validate that the machine is ready. |
| Stage 2   | Create repository structure     | Set up a clean monorepo and project conventions.      |
| Stage 3   | Build minimum frontend and API  | Prove frontend/backend communication.                 |
| Stage 4   | Add databases                   | Store structured and unstructured data correctly.     |
| Stage 5   | Dockerize everything            | Make the project reproducible on any machine.         |
| Stage 6   | Add AI workflows                | Introduce summarization, RAG, and assistant features. |
| Stage 7   | Deploy and observe              | Push to staging/cloud and monitor behavior.           |
| Stage 8   | Document and present            | Explain the system like an engineer.                  |

# 5\. Stage 0 - Understand the Domain

**Goal:** Before touching code, the trainee should understand the business workflow and the medical context at a high level.

## Actions

- Identify the main user: the doctor (the only role in this simplified app).
- Write the core workflow: open patient → add medical note → AI summarizes → doctor reviews.
- List sensitive data that must be protected.
- Define what AI is allowed to assist with and what must remain human-reviewed.

**Deliverable:** One-page domain summary and a simple workflow diagram.

**Checkpoint question:** Can you explain the product to a non-technical manager in two minutes?

# 6\. Stage 1 - Prepare the Development Environment

**Goal:** Set up a reliable local environment that supports full-stack, containerized development.

## Actions

- Install Git, VS Code, Docker Desktop or Docker Engine, Node.js LTS, Yarn, and a database client.
- Create SSH keys and connect the machine to the company Git provider.
- Install useful VS Code extensions: Docker, ESLint, Prettier, PostgreSQL, MongoDB, REST Client.
- Verify Docker, Node.js, Yarn, and Git from the terminal.
- Create a local workspace folder for the project.

**Deliverable:** A ready development machine with all tools verified.

**Checkpoint question:** Can you clone, run, edit, and commit a basic project?

| **Check**      | **Command**            |
| -------------- | ---------------------- |
| Node.js        | node -v                |
| Yarn           | yarn -v                |
| Git            | git --version          |
| Docker         | docker --version       |
| Docker Compose | docker compose version |

# 7\. Stage 2 - Create the Project Structure

**Goal:** Use a clear structure that separates frontend, services, shared packages, and infrastructure.

## Actions

- Create a Git repository using a monorepo structure.
- Add folders for apps, services, packages, infrastructure, and documentation.
- Create a README explaining how the repository is organized.
- Add code formatting and linting rules early.
- Create a .env.example file but never commit real secrets.

**Deliverable:** Clean repository skeleton with README and environment template.

**Checkpoint question:** Can another developer understand the repository in five minutes?

**Suggested structure:**

- apps/web
- services/api
- packages/shared
- infra/docker
- infra/deployment
- docs

# 8\. Stage 3 - Build the First Working Slice

**Goal:** Create a very small end-to-end flow before adding complexity.

## Actions

- Create a React web app (with Vite) that shows a simple doctor dashboard page.
- Create an Express API endpoint that returns a health status.
- Connect the frontend to the API and display the service status.
- Add a simple patient list screen using mock data.
- Commit this as the first working vertical slice.

**Deliverable:** A frontend page calling a backend API successfully.

**Checkpoint question:** Does the browser prove that frontend and backend communicate?

# 9\. Stage 4 - Add SQL and NoSQL Databases

**Goal:** Introduce data storage based on the type of data being handled.

## Actions

- Use PostgreSQL for patients, the doctor user, and medical note metadata.
- Use MongoDB for AI conversations, audit logs, raw imported notes, and activity history.
- Create migrations or schema definitions.
- Implement basic CRUD operations for patients and notes.
- Log key doctor actions to MongoDB.

**Deliverable:** A working patient and notes module with SQL storage, plus audit logs in NoSQL.

**Checkpoint question:** Can you justify why each piece of data goes to SQL or NoSQL?

# 10\. Stage 5 - Dockerize the Project

**Goal:** Make the full project runnable without manual installation of every dependency.

## Actions

- Create Dockerfiles for the frontend and the Express API.
- Create a docker-compose.yml that runs the web app, the API, PostgreSQL, and MongoDB.
- Move configuration into environment variables.
- Add startup instructions to the README.
- Test the project from a clean terminal using Docker only.

**Deliverable:** One-command local environment using Docker Compose.

**Checkpoint question:** Can a new developer run the project without asking for missing steps?

# 11\. Stage 6 - Add AI Capabilities

**Goal:** Add AI features that are useful in a medical software workflow while keeping human review in control.

## Actions

- Add an AI module inside the Express API for medical note summarization.
- Store prompts, responses, and review status in MongoDB.
- Add a medical note summarization feature.
- Create simple search over previous notes.
- Add an assistant screen in React that answers using retrieved context.
- Display a clear human-review state before any AI output is accepted.

**Deliverable:** An AI copilot that summarizes notes and performs context-aware search.

**Checkpoint question:** Can the trainee explain the difference between normal search and semantic search?

# 12\. Stage 7 - Cloud Deployment and CI/CD

**Goal:** Move the project from local development to a controlled staging environment.

## Actions

- Create separate environment files for local and staging.
- Build Docker images and push them to a container registry.
- Create a simple CI pipeline that runs linting, tests, and image build.
- Deploy the services to a staging server, Kubernetes cluster, or cloud container service.
- Configure logs, health checks, and restart behavior.
- Document the deployment process.

**Deliverable:** A deployed staging version of the project with basic monitoring.

**Checkpoint question:** Can the trainee explain what happens from git push to deployment?

# 13\. Stage 8 - Security, Privacy, and Safety Review

**Goal:** Review the project through the lens of healthcare software responsibility.

## Actions

- Verify that secrets are not committed.
- Add authentication and role-based access rules conceptually or technically.
- Add audit logging for important actions.
- Mask or avoid real patient data in development.
- Document AI limitations and require human review.
- Prepare a short risk list with mitigations.

**Deliverable:** Security and AI safety checklist completed.

**Checkpoint question:** What can go wrong if AI output is trusted blindly?

# 14\. Suggested Four-Week Execution Plan

| **Week** | **Main Focus**               | **Build Target**                                    | **Review**               |
| -------- | ---------------------------- | --------------------------------------------------- | ------------------------ |
| 1        | Domain, setup, repository    | Working repo + frontend/API health check            | Architecture explanation |
| 2        | Database and API             | Patients + notes + audit logs                       | Data model review        |
| 3        | Docker and AI                | Docker Compose + AI summarization + semantic search | AI flow demo             |
| 4        | Deployment and documentation | Staging deployment + final documentation            | Final presentation       |

# 15\. Definition of Done

- Project runs locally with one documented command.
- Frontend communicates with backend services.
- SQL and NoSQL databases are both used for justified purposes.
- At least one AI workflow is integrated end-to-end.
- AI outputs are stored and marked for human review.
- Docker Compose setup is complete.
- Staging deployment is documented or demonstrated.
- README explains setup, architecture, and troubleshooting.
- Trainee can explain technical decisions clearly.

# 16\. Recommended First README Sections

- Project overview
- Architecture diagram
- Technology stack
- Local setup
- Environment variables
- Running with Docker
- Database setup
- AI service setup
- Deployment steps
- Troubleshooting
- Known limitations
