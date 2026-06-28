import './env.js';
import express from 'express';
import cors from 'cors';
import { DEMO_DOCTOR_ID } from './config.js';
import { connectDatabase } from './db.js';
import { AuditLog } from './models/AuditLog.js';
import { Appointment } from './models/Appointment.js';
import { Note } from './models/Note.js';
import { Patient } from './models/Patient.js';

const app = express();
const port = process.env.API_PORT || 3001;
const patientPublicFields = '-_id -__v -doctorId -createdAt -updatedAt';
const appointmentPublicFields = '-_id -__v -doctorId -createdAt -updatedAt';
const notePublicFields = '-_id -__v -doctorId';

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

function createAppointmentId() {
  return `A-${Date.now().toString(36).toUpperCase()}`;
}

function createNoteId() {
  return `N-${Date.now().toString(36).toUpperCase()}`;
}

function createAuditLogId() {
  return `L-${Date.now().toString(36).toUpperCase()}`;
}

function cleanAppointmentInput(input = {}, { partial = false } = {}) {
  const cleaned = {};
  const textFields = ['patientId', 'scheduledDate', 'scheduledTime', 'reason', 'status'];

  for (const field of textFields) {
    if (Object.hasOwn(input, field)) {
      cleaned[field] = String(input[field] ?? '').trim();
    }
  }

  if (!partial && !cleaned.patientId) {
    throw new Error('Patient is required.');
  }

  return cleaned;
}

function cleanNoteInput(input = {}, { partial = false } = {}) {
  const cleaned = {};

  if (Object.hasOwn(input, 'patientId')) {
    cleaned.patientId = String(input.patientId ?? '').trim();
  }

  if (Object.hasOwn(input, 'appointmentId')) {
    const appointmentId = String(input.appointmentId ?? '').trim();
    cleaned.appointmentId = appointmentId || null;
  }

  if (Object.hasOwn(input, 'text')) {
    cleaned.text = String(input.text ?? '').trim();
  }

  if (!partial && !cleaned.patientId) {
    throw new Error('Patient is required.');
  }

  if (!partial && !cleaned.text) {
    throw new Error('Note text is required.');
  }

  if (Object.hasOwn(cleaned, 'text') && !cleaned.text) {
    throw new Error('Note text is required.');
  }

  return cleaned;
}

async function buildAppointmentResponse(appointment) {
  const patient = await Patient.findOne({
    doctorId: DEMO_DOCTOR_ID,
    id: appointment.patientId,
  })
    .select(patientPublicFields)
    .lean();

  return {
    ...appointment,
    patient,
  };
}

async function refreshPatientNoteCount(patientId) {
  const noteCount = await Note.countDocuments({
    doctorId: DEMO_DOCTOR_ID,
    patientId,
  });

  await Patient.updateOne(
    { doctorId: DEMO_DOCTOR_ID, id: patientId },
    {
      $set: {
        noteCount,
      },
    },
  );

  return noteCount;
}

async function writeAuditLog(action, targetType, targetId) {
  try {
    await AuditLog.create({
      doctorId: DEMO_DOCTOR_ID,
      id: createAuditLogId(),
      action,
      targetType,
      targetId,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

async function upsertTodayAppointmentForPatient(patient) {
  if (!patient.appointment && !patient.reason) return;

  await Appointment.updateOne(
    { doctorId: DEMO_DOCTOR_ID, patientId: patient.id, scheduledDate: '2026-06-28' },
    {
      $set: {
        scheduledTime: patient.appointment || '',
        reason: patient.reason || '',
        status: patient.status || 'Scheduled',
      },
      $setOnInsert: {
        doctorId: DEMO_DOCTOR_ID,
        patientId: patient.id,
        scheduledDate: '2026-06-28',
        id: createAppointmentId(),
      },
    },
    { upsert: true },
  );
}

async function syncPatientVisitFields(appointment) {
  await Patient.updateOne(
    { doctorId: DEMO_DOCTOR_ID, id: appointment.patientId },
    {
      $set: {
        appointment: appointment.scheduledTime || '',
        reason: appointment.reason || '',
        status: appointment.status || 'Scheduled',
      },
    },
  );
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

app.get('/api/appointments', async (req, res) => {
  try {
    const query = {
      doctorId: DEMO_DOCTOR_ID,
    };

    if (req.query.date) {
      query.scheduledDate = String(req.query.date);
    }

    const appointments = await Appointment.find(query)
      .select(appointmentPublicFields)
      .sort({ scheduledDate: -1, scheduledTime: 1 })
      .lean();

    const response = await Promise.all(appointments.map(buildAppointmentResponse));
    res.json(response.filter((appointment) => appointment.patient));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const payload = cleanAppointmentInput(req.body);
    const patient = await Patient.findOne({
      doctorId: DEMO_DOCTOR_ID,
      id: payload.patientId,
    }).lean();

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const appointment = await Appointment.create({
      scheduledDate: '2026-06-28',
      scheduledTime: '',
      reason: '',
      status: 'Scheduled',
      ...payload,
      doctorId: DEMO_DOCTOR_ID,
      id: createAppointmentId(),
    });

    const savedAppointment = await Appointment.findById(appointment._id)
      .select(appointmentPublicFields)
      .lean();
    await syncPatientVisitFields(savedAppointment);
    res.status(201).json(await buildAppointmentResponse(savedAppointment));
  } catch (error) {
    if (error.message === 'Patient is required.' || error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const payload = cleanAppointmentInput(req.body, { partial: true });
    const appointment = await Appointment.findOneAndUpdate(
      { doctorId: DEMO_DOCTOR_ID, id: req.params.id },
      { $set: payload },
      { new: true, runValidators: true },
    )
      .select(appointmentPublicFields)
      .lean();

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    await syncPatientVisitFields(appointment);
    res.json(await buildAppointmentResponse(appointment));
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const query = {
      doctorId: DEMO_DOCTOR_ID,
    };

    if (req.query.patientId) {
      query.patientId = String(req.query.patientId);
    }

    if (req.query.appointmentId) {
      query.appointmentId = String(req.query.appointmentId);
    }

    const notes = await Note.find(query).select(notePublicFields).sort({ createdAt: -1 }).lean();
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const payload = cleanNoteInput(req.body);
    const patient = await Patient.findOne({
      doctorId: DEMO_DOCTOR_ID,
      id: payload.patientId,
    }).lean();

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    if (payload.appointmentId) {
      const appointment = await Appointment.findOne({
        doctorId: DEMO_DOCTOR_ID,
        id: payload.appointmentId,
        patientId: payload.patientId,
      }).lean();

      if (!appointment) {
        res.status(404).json({ error: 'Visit not found' });
        return;
      }
    }

    const note = await Note.create({
      ...payload,
      doctorId: DEMO_DOCTOR_ID,
      id: createNoteId(),
    });

    const savedNote = await Note.findById(note._id).select(notePublicFields).lean();
    await refreshPatientNoteCount(savedNote.patientId);
    await writeAuditLog('note.created', 'Note', savedNote.id);
    res.status(201).json(savedNote);
  } catch (error) {
    if (
      error.message === 'Patient is required.' ||
      error.message === 'Note text is required.' ||
      error.name === 'ValidationError'
    ) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.patch('/api/notes/:id', async (req, res) => {
  try {
    const payload = cleanNoteInput(req.body, { partial: true });
    const existingNote = await Note.findOne({
      doctorId: DEMO_DOCTOR_ID,
      id: req.params.id,
    }).lean();

    if (!existingNote) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    if (payload.appointmentId) {
      const appointment = await Appointment.findOne({
        doctorId: DEMO_DOCTOR_ID,
        id: payload.appointmentId,
        patientId: existingNote.patientId,
      }).lean();

      if (!appointment) {
        res.status(404).json({ error: 'Visit not found' });
        return;
      }
    }

    delete payload.patientId;

    const note = await Note.findOneAndUpdate(
      { doctorId: DEMO_DOCTOR_ID, id: req.params.id },
      { $set: payload },
      { new: true, runValidators: true },
    )
      .select(notePublicFields)
      .lean();

    await writeAuditLog('note.updated', 'Note', note.id);
    res.json(note);
  } catch (error) {
    if (error.message === 'Note text is required.' || error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      doctorId: DEMO_DOCTOR_ID,
      id: req.params.id,
    })
      .select(notePublicFields)
      .lean();

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    await refreshPatientNoteCount(note.patientId);
    await writeAuditLog('note.deleted', 'Note', note.id);
    res.json({ deleted: true, note });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

app.get('/api/patients/:id/timeline', async (req, res) => {
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

    const [appointments, notes] = await Promise.all([
      Appointment.find({
        doctorId: DEMO_DOCTOR_ID,
        patientId: req.params.id,
      })
        .select(appointmentPublicFields)
        .lean(),
      Note.find({
        doctorId: DEMO_DOCTOR_ID,
        patientId: req.params.id,
      })
        .select(notePublicFields)
        .lean(),
    ]);

    const appointmentItems = appointments.map((appointment) => ({
      type: 'visit',
      id: appointment.id,
      date: appointment.scheduledDate,
      time: appointment.scheduledTime,
      title: appointment.reason || 'Visit',
      status: appointment.status,
      appointment,
    }));

    const noteItems = notes.map((note) => ({
      type: 'note',
      id: note.id,
      date: note.createdAt,
      time: '',
      title: note.appointmentId ? 'Visit note' : 'Standalone note',
      text: note.text,
      appointmentId: note.appointmentId,
      note,
    }));

    const timeline = [...appointmentItems, ...noteItems].sort((a, b) => {
      const dateA = new Date(`${a.date || ''} ${a.time || ''}`).getTime() || 0;
      const dateB = new Date(`${b.date || ''} ${b.time || ''}`).getTime() || 0;
      return dateB - dateA;
    });

    res.json({ patient, timeline });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load patient timeline' });
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
    await upsertTodayAppointmentForPatient(savedPatient);
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

    await upsertTodayAppointmentForPatient(patient);
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

app.delete('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findOneAndDelete({
      doctorId: DEMO_DOCTOR_ID,
      id: req.params.id,
    })
      .select(patientPublicFields)
      .lean();

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    await Appointment.deleteMany({
      doctorId: DEMO_DOCTOR_ID,
      patientId: req.params.id,
    });
    await Note.deleteMany({
      doctorId: DEMO_DOCTOR_ID,
      patientId: req.params.id,
    });
    await writeAuditLog('patient.deleted', 'Patient', patient.id);

    res.json({ deleted: true, patient });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete patient' });
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
