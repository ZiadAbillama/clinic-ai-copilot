import './env.js';
import express from 'express';
import cors from 'cors';
import { DEMO_DOCTOR_ID } from './config.js';
import { connectDatabase } from './db.js';
import { Patient } from './models/Patient.js';

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

// Read-only patient list from MongoDB Atlas.
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.find({ doctorId: DEMO_DOCTOR_ID })
      .select('-_id -__v -doctorId -createdAt -updatedAt')
      .sort({ appointment: 1 })
      .lean();

    res.json(patients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load patients' });
  }
});

app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({
      doctorId: DEMO_DOCTOR_ID,
      id: req.params.id,
    })
      .select('-_id -__v -doctorId -createdAt -updatedAt')
      .lean();

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load patient' });
  }
});

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Clinic AI Copilot API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start API:', error);
    process.exit(1);
  });
