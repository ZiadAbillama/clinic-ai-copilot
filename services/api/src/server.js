import './env.js';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CORS_ORIGINS, JWT_EXPIRES_IN, JWT_SECRET } from './config.js';
import { connectDatabase } from './db.js';
import { AuditLog } from './models/AuditLog.js';
import { Appointment } from './models/Appointment.js';
import { Doctor } from './models/Doctor.js';
import { Note } from './models/Note.js';
import { Patient } from './models/Patient.js';
import { visitStatuses } from './statuses.js';

const app = express();
const port = process.env.API_PORT || 3001;
const patientPublicFields = '-_id -__v -doctorId -createdAt -updatedAt -archivedAt';
const appointmentPublicFields = '-_id -__v -doctorId -createdAt -updatedAt -archivedAt';
const notePublicFields = '-_id -__v -doctorId -archivedAt';
const visitStatusSet = new Set(visitStatuses);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const patientFieldMaxLengths = {
  name: 120,
  dob: 10,
  contact: 40,
  reason: 160,
  appointment: 5,
  status: 32,
  lastVisit: 20,
};
const appointmentFieldMaxLengths = {
  patientId: 64,
  scheduledDate: 10,
  scheduledTime: 5,
  reason: 160,
  status: 32,
};

function getTodayDateString() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function createInputError(message) {
  const error = new Error(message);
  error.name = 'InputError';
  return error;
}

function isInputError(error) {
  return error.name === 'InputError' || error.name === 'ValidationError';
}

function isDateString(value) {
  if (!datePattern.test(value)) return false;

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function validateMaxLengths(cleaned, lengths) {
  for (const [field, maxLength] of Object.entries(lengths)) {
    if (Object.hasOwn(cleaned, field) && String(cleaned[field]).length > maxLength) {
      throw createInputError(`${field} must be ${maxLength} characters or fewer.`);
    }
  }
}

function validateDateField(cleaned, field) {
  if (Object.hasOwn(cleaned, field) && cleaned[field] && !isDateString(cleaned[field])) {
    throw createInputError(`${field} must use YYYY-MM-DD format.`);
  }
}

function validateTimeField(cleaned, field) {
  if (Object.hasOwn(cleaned, field) && cleaned[field] && !timePattern.test(cleaned[field])) {
    throw createInputError(`${field} must use HH:mm format.`);
  }
}

function validateStatusField(cleaned) {
  if (Object.hasOwn(cleaned, 'status') && cleaned.status && !visitStatusSet.has(cleaned.status)) {
    throw createInputError(`status must be one of: ${visitStatuses.join(', ')}.`);
  }
}

function getPagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 50, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function setPaginationHeaders(res, { page, limit, hasNextPage }) {
  res.set('X-Pagination-Page', String(page));
  res.set('X-Pagination-Limit', String(limit));
  res.set('X-Pagination-Has-Next-Page', String(hasNextPage));
}

function logApiError(event, error) {
  console.error({
    event,
    error: {
      name: error?.name || 'Error',
      code: error?.code || undefined,
      status: error?.status || undefined,
    },
  });
}

function cleanPatientInput(input = {}, { partial = false } = {}) {
  const cleaned = {};
  const textFields = ['name', 'dob', 'contact', 'reason', 'appointment', 'status', 'lastVisit'];

  for (const field of textFields) {
    if (Object.hasOwn(input, field)) {
      cleaned[field] = String(input[field] ?? '').trim();
    }
  }

  if (!partial && !cleaned.name) {
    throw createInputError('Patient name is required.');
  }

  validateMaxLengths(cleaned, patientFieldMaxLengths);
  validateDateField(cleaned, 'dob');
  validateTimeField(cleaned, 'appointment');
  validateStatusField(cleaned);

  if (
    Object.hasOwn(cleaned, 'lastVisit') &&
    cleaned.lastVisit &&
    cleaned.lastVisit !== 'New patient' &&
    !isDateString(cleaned.lastVisit)
  ) {
    throw createInputError('lastVisit must use YYYY-MM-DD format or New patient.');
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
    throw createInputError('Patient is required.');
  }

  validateMaxLengths(cleaned, appointmentFieldMaxLengths);
  validateDateField(cleaned, 'scheduledDate');
  validateTimeField(cleaned, 'scheduledTime');
  validateStatusField(cleaned);

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
  const responses = await buildAppointmentResponses([appointment], doctorId);
  return responses[0] || { ...appointment, patient: null };
}

async function buildAppointmentResponses(appointments, doctorId) {
  const patientIds = [...new Set(appointments.map((appointment) => appointment.patientId))];
  const patients = await Patient.find({
    doctorId,
    id: { $in: patientIds },
    archivedAt: null,
  })
    .select(patientPublicFields)
    .lean();
  const patientsById = new Map(patients.map((patient) => [patient.id, patient]));

  return appointments.map((appointment) => ({
    ...appointment,
    patient: patientsById.get(appointment.patientId) || null,
  }));
}

async function refreshPatientNoteCount(doctorId, patientId) {
  const noteCount = await Note.countDocuments({
    doctorId,
    patientId,
    archivedAt: null,
  });

  await Patient.updateOne(
    { doctorId, id: patientId, archivedAt: null },
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
    logApiError('audit_log.write_failed', error);
  }
}

async function upsertTodayAppointmentForPatient(doctorId, patient) {
  if (!patient.appointment && !patient.reason) return;

  const today = getTodayDateString();

  await Appointment.updateOne(
    { doctorId, patientId: patient.id, scheduledDate: today, archivedAt: null },
    {
      $set: {
        scheduledTime: patient.appointment || '',
        reason: patient.reason || '',
        status: patient.status || 'Scheduled',
      },
      $setOnInsert: {
        doctorId,
        patientId: patient.id,
        scheduledDate: today,
        id: createAppointmentId(),
      },
    },
    { upsert: true },
  );
}

async function syncPatientVisitFields(doctorId, appointment) {
  await Patient.updateOne(
    { doctorId, id: appointment.patientId, archivedAt: null },
    {
      $set: {
        appointment: appointment.scheduledTime || '',
        reason: appointment.reason || '',
        status: appointment.status || 'Scheduled',
      },
    },
  );
}

async function refreshPatientVisitFields(doctorId, patientId) {
  const latestAppointment = await Appointment.findOne({
    doctorId,
    patientId,
    archivedAt: null,
  })
    .sort({ scheduledDate: -1, scheduledTime: -1, id: 1 })
    .select(appointmentPublicFields)
    .lean();

  await Patient.updateOne(
    { doctorId, id: patientId, archivedAt: null },
    {
      $set: {
        appointment: latestAppointment?.scheduledTime || '',
        reason: latestAppointment?.reason || '',
        status: latestAppointment?.status || 'Scheduled',
      },
    },
  );
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    exposedHeaders: ['X-Pagination-Page', 'X-Pagination-Limit', 'X-Pagination-Has-Next-Page'],
  }),
);
app.use(express.json());

// API health endpoint.
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

    logApiError('auth.register_failed', error);
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

    logApiError('auth.login_failed', error);
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
    const pagination = getPagination(req.query);
    const patients = await Patient.find({ doctorId: req.doctor.id, archivedAt: null })
      .select(patientPublicFields)
      .sort({ appointment: 1, id: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit + 1)
      .lean();

    setPaginationHeaders(res, {
      ...pagination,
      hasNextPage: patients.length > pagination.limit,
    });
    res.json(patients.slice(0, pagination.limit));
  } catch (error) {
    logApiError('patients.list_failed', error);
    res.status(500).json({ error: 'Failed to load patients' });
  }
});

app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({
      doctorId: req.doctor.id,
      id: req.params.id,
      archivedAt: null,
    })
      .select(patientPublicFields)
      .lean();

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json(patient);
  } catch (error) {
    logApiError('patients.read_failed', error);
    res.status(500).json({ error: 'Failed to load patient' });
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const pagination = getPagination(req.query);
    const archiveMode = req.query.archived === 'true' ? 'archived' : 'active';
    const query = {
      doctorId: req.doctor.id,
      archivedAt: archiveMode === 'archived' ? { $ne: null } : null,
    };

    if (req.query.date) {
      query.scheduledDate = String(req.query.date);
    }

    if (req.query.patientId) {
      query.patientId = String(req.query.patientId);
    }

    const appointments = await Appointment.find(query)
      .select(appointmentPublicFields)
      .sort({ scheduledDate: -1, scheduledTime: 1, id: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit + 1)
      .lean();

    const response = await buildAppointmentResponses(
      appointments.slice(0, pagination.limit),
      req.doctor.id,
    );
    setPaginationHeaders(res, {
      ...pagination,
      hasNextPage: appointments.length > pagination.limit,
    });
    res.json(response.filter((appointment) => appointment.patient));
  } catch (error) {
    logApiError('appointments.list_failed', error);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const payload = cleanAppointmentInput(req.body);
    const patient = await Patient.findOne({
      doctorId: req.doctor.id,
      id: payload.patientId,
      archivedAt: null,
    }).lean();

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const appointment = await Appointment.create({
      scheduledDate: getTodayDateString(),
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
    await writeAuditLog(req.doctor.id, 'appointment.created', 'Appointment', savedAppointment.id);
    res.status(201).json(await buildAppointmentResponse(savedAppointment, req.doctor.id));
  } catch (error) {
    if (isInputError(error)) {
      res.status(400).json({ error: error.message });
      return;
    }

    logApiError('appointments.create_failed', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const payload = cleanAppointmentInput(req.body, { partial: true });
    const appointment = await Appointment.findOneAndUpdate(
      { doctorId: req.doctor.id, id: req.params.id, archivedAt: null },
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
    await writeAuditLog(req.doctor.id, 'appointment.updated', 'Appointment', appointment.id);
    res.json(await buildAppointmentResponse(appointment, req.doctor.id));
  } catch (error) {
    if (isInputError(error)) {
      res.status(400).json({ error: error.message });
      return;
    }

    logApiError('appointments.update_failed', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { doctorId: req.doctor.id, id: req.params.id, archivedAt: null },
      {
        $set: {
          archivedAt: new Date(),
        },
      },
      { new: true },
    )
      .select(appointmentPublicFields)
      .lean();

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    await refreshPatientVisitFields(req.doctor.id, appointment.patientId);
    await writeAuditLog(req.doctor.id, 'appointment.archived', 'Appointment', appointment.id);
    res.json({ deleted: true, archived: true, appointment });
  } catch (error) {
    logApiError('appointments.delete_failed', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const pagination = getPagination(req.query);
    const query = {
      doctorId: req.doctor.id,
      archivedAt: null,
    };

    if (req.query.patientId) {
      query.patientId = String(req.query.patientId);
    }

    if (req.query.appointmentId) {
      query.appointmentId = String(req.query.appointmentId);
    }

    const notes = await Note.find(query)
      .select(notePublicFields)
      .sort({ createdAt: -1, id: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit + 1)
      .lean();
    setPaginationHeaders(res, {
      ...pagination,
      hasNextPage: notes.length > pagination.limit,
    });
    res.json(notes.slice(0, pagination.limit));
  } catch (error) {
    logApiError('notes.list_failed', error);
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const payload = cleanNoteInput(req.body);
    const patient = await Patient.findOne({
      doctorId: req.doctor.id,
      id: payload.patientId,
      archivedAt: null,
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
        archivedAt: null,
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

    logApiError('notes.create_failed', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.patch('/api/notes/:id', async (req, res) => {
  try {
    const payload = cleanNoteInput(req.body, { partial: true });
    const existingNote = await Note.findOne({
      doctorId: req.doctor.id,
      id: req.params.id,
      archivedAt: null,
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
        archivedAt: null,
      }).lean();

      if (!appointment) {
        res.status(404).json({ error: 'Visit not found' });
        return;
      }
    }

    delete payload.patientId;

    const note = await Note.findOneAndUpdate(
      { doctorId: req.doctor.id, id: req.params.id, archivedAt: null },
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

    logApiError('notes.update_failed', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      {
        doctorId: req.doctor.id,
        id: req.params.id,
        archivedAt: null,
      },
      {
        $set: {
          archivedAt: new Date(),
        },
      },
      { new: true },
    )
      .select(notePublicFields)
      .lean();

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    await refreshPatientNoteCount(req.doctor.id, note.patientId);
    await writeAuditLog(req.doctor.id, 'note.archived', 'Note', note.id);
    res.json({ deleted: true, archived: true, note });
  } catch (error) {
    logApiError('notes.delete_failed', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

app.get('/api/patients/:id/timeline', async (req, res) => {
  try {
    const pagination = getPagination(req.query);
    const timelineFetchLimit = pagination.skip + pagination.limit + 1;
    const patient = await Patient.findOne({
      doctorId: req.doctor.id,
      id: req.params.id,
      archivedAt: null,
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
        archivedAt: null,
      })
        .select(appointmentPublicFields)
        .sort({ scheduledDate: -1, scheduledTime: -1, id: 1 })
        .limit(timelineFetchLimit)
        .lean(),
      Note.find({
        doctorId: req.doctor.id,
        patientId: req.params.id,
        archivedAt: null,
      })
        .select(notePublicFields)
        .sort({ createdAt: -1, id: 1 })
        .limit(timelineFetchLimit)
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
    const pagedTimeline = timeline.slice(pagination.skip, pagination.skip + pagination.limit);
    const hasNextPage = timeline.length > pagination.skip + pagination.limit;

    setPaginationHeaders(res, {
      ...pagination,
      hasNextPage,
    });
    res.json({
      patient,
      timeline: pagedTimeline,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        hasNextPage,
      },
    });
  } catch (error) {
    logApiError('patients.timeline_failed', error);
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
    await writeAuditLog(req.doctor.id, 'patient.created', 'Patient', savedPatient.id);
    res.status(201).json(savedPatient);
  } catch (error) {
    if (isInputError(error)) {
      res.status(400).json({ error: error.message });
      return;
    }

    logApiError('patients.create_failed', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

app.patch('/api/patients/:id', async (req, res) => {
  try {
    const payload = cleanPatientInput(req.body, { partial: true });
    const patient = await Patient.findOneAndUpdate(
      { doctorId: req.doctor.id, id: req.params.id, archivedAt: null },
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
    await writeAuditLog(req.doctor.id, 'patient.updated', 'Patient', patient.id);
    res.json(patient);
  } catch (error) {
    if (isInputError(error)) {
      res.status(400).json({ error: error.message });
      return;
    }

    logApiError('patients.update_failed', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

app.delete('/api/patients/:id', async (req, res) => {
  try {
    const archivedAt = new Date();
    const patient = await Patient.findOneAndUpdate(
      {
        doctorId: req.doctor.id,
        id: req.params.id,
        archivedAt: null,
      },
      {
        $set: {
          archivedAt,
        },
      },
      { new: true },
    )
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
        archivedAt: null,
      })
        .select(appointmentPublicFields)
        .lean(),
      Note.find({
        doctorId: req.doctor.id,
        patientId: req.params.id,
        archivedAt: null,
      })
        .select(notePublicFields)
        .lean(),
    ]);

    await Promise.all([
      Appointment.updateMany(
        {
          doctorId: req.doctor.id,
          patientId: req.params.id,
          archivedAt: null,
        },
        {
          $set: {
            archivedAt,
          },
        },
      ),
      Note.updateMany(
        {
          doctorId: req.doctor.id,
          patientId: req.params.id,
          archivedAt: null,
        },
        {
          $set: {
            archivedAt,
          },
        },
      ),
    ]);

    await Promise.all([
      writeAuditLog(req.doctor.id, 'patient.archived', 'Patient', patient.id),
      ...appointments.map((appointment) =>
        writeAuditLog(req.doctor.id, 'appointment.archived', 'Appointment', appointment.id),
      ),
      ...notes.map((note) => writeAuditLog(req.doctor.id, 'note.archived', 'Note', note.id)),
    ]);

    res.json({
      deleted: true,
      archived: true,
      patient,
      archivedAppointments: appointments.length,
      archivedNotes: notes.length,
    });
  } catch (error) {
    logApiError('patients.delete_failed', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.info({
        event: 'api.started',
        service: 'clinic-ai-copilot-api',
        port,
      });
    });
  })
  .catch((error) => {
    logApiError('api.start_failed', error);
    process.exit(1);
  });
