import './env.js';
import express from 'express';
import cors from 'cors';
import { DEMO_DOCTOR_ID } from './config.js';
import { connectDatabase } from './db.js';
import { Patient } from './models/Patient.js';

const app = express();
const port = process.env.API_PORT || 3001;
const patientPublicFields = '-_id -__v -doctorId -createdAt -updatedAt';

function cleanPatientInput(input = {}, { partial = false } = {}) {
  const cleaned = {};
  const textFields = ['name', 'dob', 'contact', 'reason', 'appointment', 'status', 'lastVisit'];

  for (const field of textFields) {
    if (Object.hasOwn(input, field)) {
      cleaned[field] = String(input[field] ?? '').trim();
    }
  }

  if (Object.hasOwn(input, 'noteCount')) {
    cleaned.noteCount = Number(input.noteCount) || 0;
  }

  if (!partial && !cleaned.name) {
    throw new Error('Patient name is required.');
  }

  return cleaned;
}

function createPatientId() {
  return `P-${Date.now().toString(36).toUpperCase()}`;
}

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

// Patient records stored in MongoDB Atlas.
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.find({ doctorId: DEMO_DOCTOR_ID })
      .select(patientPublicFields)
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
      .select(patientPublicFields)
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

app.post('/api/patients', async (req, res) => {
  try {
    const payload = cleanPatientInput(req.body);
    const patient = await Patient.create({
      ...payload,
      doctorId: DEMO_DOCTOR_ID,
      id: createPatientId(),
    });

    const savedPatient = await Patient.findById(patient._id).select(patientPublicFields).lean();
    res.status(201).json(savedPatient);
  } catch (error) {
    if (error.message === 'Patient name is required.' || error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

app.patch('/api/patients/:id', async (req, res) => {
  try {
    const payload = cleanPatientInput(req.body, { partial: true });
    const patient = await Patient.findOneAndUpdate(
      { doctorId: DEMO_DOCTOR_ID, id: req.params.id },
      { $set: payload },
      { new: true, runValidators: true },
    )
      .select(patientPublicFields)
      .lean();

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json(patient);
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to update patient' });
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
