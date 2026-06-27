import express from 'express';
import cors from 'cors';
import { patients } from './data.js';

const app = express();
const port = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check used by the web app status panel.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'clinic-ai-copilot-api',
    role: 'doctor',
    time: new Date().toISOString(),
  });
});

// Read-only patient list (mock data for now).
app.get('/api/patients', (req, res) => {
  res.json(patients);
});

app.get('/api/patients/:id', (req, res) => {
  const patient = patients.find((item) => item.id === req.params.id);
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' });
    return;
  }
  res.json(patient);
});

app.listen(port, () => {
  console.log(`Clinic AI Copilot API listening on http://localhost:${port}`);
});
