# Docker

This folder contains the Docker setup for running Clinic AI Copilot without
installing each service separately.

## Local Compose

From the repository root:

```bash
docker compose up --build
```

The Compose stack starts:

- `api` on `http://localhost:3001`
- `web` on `http://localhost:3000`

The API reads `.env` from the repository root. Make sure the values from
`.env.example` are filled in before starting the stack.

If those ports are already being used by local dev servers, run the stack on
alternate host ports:

```bash
API_PORT=3101 WEB_PORT=3100 VITE_API_BASE_URL=http://localhost:3101 CORS_ORIGINS=http://localhost:3100 docker compose up --build
```

## Seeding

After `.env` is configured, seed the shared MongoDB Atlas database through the
API image:

```bash
docker compose run --rm api yarn api:seed
```

## Ollama

When running in Docker, the API container cannot reach Ollama at
`localhost:11434` because `localhost` is inside the container. Compose maps the
default Docker value to:

```env
DOCKER_OLLAMA_URL=http://host.docker.internal:11434
```

Keep Ollama running on the host machine and install the configured model:

```bash
ollama pull llama3.1:8b
ollama serve
```
