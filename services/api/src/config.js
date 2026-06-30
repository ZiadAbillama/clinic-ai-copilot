export const DEMO_DOCTOR_ID = process.env.DEMO_DOCTOR_ID || 'demo-doctor';
export const DEMO_DOCTOR_EMAIL = process.env.DEMO_DOCTOR_EMAIL || 'doctor@clinikit.local';
export const DEMO_DOCTOR_NAME = process.env.DEMO_DOCTOR_NAME || 'Demo Doctor';
export const DEMO_DOCTOR_PASSWORD = process.env.DEMO_DOCTOR_PASSWORD;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
export const OLLAMA_TIMEOUT_MS = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 45000;
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it in .env before starting the API.');
}
