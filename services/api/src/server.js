import './env.js';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from './config.js';
import { connectDatabase } from './db.js';
import { AuditLog } from './models/AuditLog.js';
import { Appointment } from './models/Appointment.js';
import { Doctor } from './models/Doctor.js';
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

function createDoctorId() {
  return `D-${Date.now().toString(36).toUpperCase()}`;
}

function cleanAuthInput(input = {}, { requireName = false } = {}) {
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(input.password ?? '');

  if (requireName && !name) {
    throw new Error('Doctor name is required.');
  }

  if (!email) {
    throw new Error('Email is required.');
  }

  if (!password) {
    throw new Error('Password is required.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  return { name, email, password };
}

function publicDoctor(doctor) {
  return {
    id: doctor.id,
    name: doctor.name,
    email: doctor.email,
  };
}

function createToken(doctor) {
  return jwt.sign(publicDoctor(doctor), JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
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

async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const doctor = await Doctor.findOne({ id: payload.id })
      .select('-_id -__v -passwordHash')
      .lean();

    if (!doctor) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    req.doctor = doctor;
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
}

async function buildAppointmentResponse(appointment, doctorId) {
  const patient = await Patient.findOne({
    doctorId,
    id: appointment.patientId,
  })
    .select(patientPublicFields)
    .lean();

  return {
    ...appointment,
    patient,
  };
}

async function refreshPatientNoteCount(doctorId, patientId) {
  const noteCount = await Note.countDocuments({
    doctorId,
    patientId,
  });

  await Patient.updateOne(
    { doctorId, id: patientId },
    {
      $set: {
        noteCount,
      },
    },
  );

  return noteCount;
}

async function writeAuditLog(doctorId, action, targetType, targetId) {
  try {
    await AuditLog.create({
      doctorId,
      id: createAuditLogId(),
      action,
      targetType,
      targetId,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

async function upsertTodayAppointmentForPatient(doctorId, patient) {
  if (!patient.appointment && !patient.reason) return;

  await Appointment.updateOne(
    { doctorId, patientId: patient.id, scheduledDate: '2026-06-28' },
    {
      $set: {
        scheduledTime: patient.appointment || '',
        reason: patient.reason || '',
        status: patient.status || 'Scheduled',
      },
      $setOnInsert: {
        doctorId,
        patientId: patient.id,
        scheduledDate: '2026-06-28',
        id: createAppointmentId(),
      },
    },
    { upsert: true },
  );
}

async function syncPatientVisitFields(doctorId, appointment) {
  await Patient.updateOne(
    { doctorId, id: appointment.patientId },
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

app.post('/api/auth/register', async (req, res) => {
  try {
    const payload = cleanAuthInput(req.body, { requireName: true });
    const existingDoctor = await Doctor.findOne({ email: payload.email }).lean();

    if (existingDoctor) {
      res.status(409).json({ error: 'A doctor account already exists for this email.' });
      return;
    }

    const doctor = await Doctor.create({
      id: createDoctorId(),
      name: payload.name,
      email: payload.email,
      passwordHash: await bcrypt.hash(payload.password, 12),
    });

    const doctorData = publicDoctor(doctor);
    res.status(201).json({
      doctor: doctorData,
      token: createToken(doctorData),
    });
  } catch (error) {
    if (
      error.message === 'Doctor name is required.' ||
      error.message === 'Email is required.' ||
      error.message === 'Password is required.' ||
      error.message === 'Password must be at least 8 characters.' ||
      error.name === 'ValidationError'
    ) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const payload = cleanAuthInput(req.body);
    const doctor = await Doctor.findOne({ email: payload.email }).lean();

    if (!doctor || !(await bcrypt.compare(payload.password, doctor.passwordHash))) {
      res.status(401).json({ error: 'Email or password is incorrect.' });
      return;
    }

    const doctorData = publicDoctor(doctor);
    res.json({
      doctor: doctorData,
      token: createToken(doctorData),
    });
  } catch (error) {
    if (
      error.message === 'Email is required.' ||
      error.message === 'Password is required.' ||
      error.message === 'Password must be at least 8 characters.'
    ) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

app.use('/api', requireAuth);

app.get('/api/auth/me', (req, res) => {
  res.json({ doctor: publicDoctor(req.doctor) });
});

// Patient records stored in MongoDB Atlas.
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.find({ doctorId: req.doctor.id })
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
      doctorId: req.doctor.id,
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
      doctorId: req.doctor.id,
    };

    if (req.query.date) {
      query.scheduledDate = String(req.query.date);
    }

    const appointments = await Appointment.find(query)
      .select(appointmentPublicFields)
      .sort({ scheduledDate: -1, scheduledTime: 1 })
      .lean();

    const response = await Promise.all(
      appointments.map((appointment) => buildAppointmentResponse(appointment, req.doctor.id)),
    );
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
      doctorId: req.doctor.id,
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
      doctorId: req.doctor.id,
      id: createAppointmentId(),
    });

    const savedAppointment = await Appointment.findById(appointment._id)
      .select(appointmentPublicFields)
      .lean();
    await syncPatientVisitFields(req.doctor.id, savedAppointment);
    res.status(201).json(await buildAppointmentResponse(savedAppointment, req.doctor.id));
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
      { doctorId: req.doctor.id, id: req.params.id },
      { $set: payload },
      { new: true, runValidators: true },
    )
      .select(appointmentPublicFields)
      .lean();

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    await syncPatientVisitFields(req.doctor.id, appointment);
    res.json(await buildAppointmentResponse(appointment, req.doctor.id));
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
      doctorId: req.doctor.id,
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
      doctorId: req.doctor.id,
      id: payload.patientId,
    }).lean();

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    if (payload.appointmentId) {
      const appointment = await Appointment.findOne({
        doctorId: req.doctor.id,
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
      doctorId: req.doctor.id,
      id: createNoteId(),
    });

    const savedNote = await Note.findById(note._id).select(notePublicFields).lean();
    await refreshPatientNoteCount(req.doctor.id, savedNote.patientId);
    await writeAuditLog(req.doctor.id, 'note.created', 'Note', savedNote.id);
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
      doctorId: req.doctor.id,
      id: req.params.id,
    }).lean();

    if (!existingNote) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    if (payload.appointmentId) {
      const appointment = await Appointment.findOne({
        doctorId: req.doctor.id,
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
      { doctorId: req.doctor.id, id: req.params.id },
      { $set: payload },
      { new: true, runValidators: true },
    )
      .select(notePublicFields)
      .lean();

    await writeAuditLog(req.doctor.id, 'note.updated', 'Note', note.id);
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
      doctorId: req.doctor.id,
      id: req.params.id,
    })
      .select(notePublicFields)
      .lean();

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    await refreshPatientNoteCount(req.doctor.id, note.patientId);
    await writeAuditLog(req.doctor.id, 'note.deleted', 'Note', note.id);
    res.json({ deleted: true, note });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

app.get('/api/patients/:id/timeline', async (req, res) => {
  try {
    const patient = await Patient.findOne({
      doctorId: req.doctor.id,
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
        doctorId: req.doctor.id,
        patientId: req.params.id,
      })
        .select(appointmentPublicFields)
        .lean(),
      Note.find({
        doctorId: req.doctor.id,
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
      doctorId: req.doctor.id,
      id: createPatientId(),
    });

    const savedPatient = await Patient.findById(patient._id).select(patientPublicFields).lean();
    await upsertTodayAppointmentForPatient(req.doctor.id, savedPatient);
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
      { doctorId: req.doctor.id, id: req.params.id },
      { $set: payload },
      { new: true, runValidators: true },
    )
      .select(patientPublicFields)
      .lean();

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    await upsertTodayAppointmentForPatient(req.doctor.id, patient);
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
      doctorId: req.doctor.id,
      id: req.params.id,
    })
      .select(patientPublicFields)
      .lean();

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    await Appointment.deleteMany({
      doctorId: req.doctor.id,
      patientId: req.params.id,
    });
    await Note.deleteMany({
      doctorId: req.doctor.id,
      patientId: req.params.id,
    });
    await writeAuditLog(req.doctor.id, 'patient.deleted', 'Patient', patient.id);

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
