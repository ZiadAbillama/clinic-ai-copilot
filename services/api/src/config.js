export const DEMO_DOCTOR_ID = process.env.DEMO_DOCTOR_ID || 'demo-doctor';
export const DEMO_DOCTOR_EMAIL = process.env.DEMO_DOCTOR_EMAIL || 'doctor@clinikit.local';
export const DEMO_DOCTOR_NAME = process.env.DEMO_DOCTOR_NAME || 'Demo Doctor';
export const DEMO_DOCTOR_PASSWORD = process.env.DEMO_DOCTOR_PASSWORD;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it in .env before starting the API.');
}
