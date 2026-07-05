# Deployment Notes

Stage 10 adds containerized deployment readiness. The project is not tied to a
single host yet, but the deployment shape should stay the same:

- Build the API with `infra/docker/api.Dockerfile`.
- Build the web app with `infra/docker/web.Dockerfile`.
- Provide production environment variables through the host's secret manager.
- Point `VITE_API_BASE_URL` at the public API URL during the web build.
- Set `CORS_ORIGINS` to the deployed web origin only.
- Use a production MongoDB Atlas connection string, separate from shared
  development data.
- Use a strong `JWT_SECRET`; never reuse the local development value.

Render staging is documented in `infra/deployment/render.md`, and the root
`render.yaml` file defines the staging API/web services.

## Required Production Variables

```env
NODE_ENV=production
MONGO_URL=replace_with_production_mongodb_atlas_url
JWT_SECRET=replace_with_production_secret
CORS_ORIGINS=https://replace-with-web-origin.example
VITE_API_BASE_URL=https://replace-with-api-origin.example
OLLAMA_URL=http://replace-with-ai-host:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=45000
```

## Pre-Deployment Checks

Run these before promoting a build:

```bash
yarn lint
yarn web:build
docker compose config
docker compose build
```

Known future hardening still needed before a real public production launch:

- Login/register rate limiting
- Forgot/reset password flow
- Stronger session strategy such as httpOnly cookie sessions
- Hosting decision and CI/CD pipeline
