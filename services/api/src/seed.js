import './env.js';
import bcrypt from 'bcryptjs';
import {
  DEMO_DOCTOR_EMAIL,
  DEMO_DOCTOR_ID,
  DEMO_DOCTOR_NAME,
  DEMO_DOCTOR_PASSWORD,
} from './config.js';
import { seedAppointments, seedPatients } from './data.js';
import { connectDatabase, disconnectDatabase } from './db.js';
import { Appointment } from './models/Appointment.js';
import { Doctor } from './models/Doctor.js';
import { Patient } from './models/Patient.js';

function logSeedError(event, error) {
  console.error({
    event,
    error: {
      name: error?.name || 'Error',
      code: error?.code || undefined,
      status: error?.status || undefined,
    },
  });
}

async function seed() {
  await connectDatabase();

  if (!DEMO_DOCTOR_PASSWORD) {
    throw new Error('DEMO_DOCTOR_PASSWORD is required to seed the demo doctor.');
  }

  const passwordHash = await bcrypt.hash(DEMO_DOCTOR_PASSWORD, 12);

  await Doctor.updateOne(
    { id: DEMO_DOCTOR_ID },
    {
      $set: {
        email: DEMO_DOCTOR_EMAIL,
        name: DEMO_DOCTOR_NAME,
        passwordHash,
      },
      $setOnInsert: {
        id: DEMO_DOCTOR_ID,
      },
    },
    { upsert: true },
  );

  for (const patient of seedPatients) {
    await Patient.updateOne(
      { doctorId: DEMO_DOCTOR_ID, id: patient.id },
      { $set: { ...patient, doctorId: DEMO_DOCTOR_ID } },
      { upsert: true },
    );
  }

  for (const appointment of seedAppointments) {
    await Appointment.updateOne(
      { doctorId: DEMO_DOCTOR_ID, id: appointment.id },
      { $set: { ...appointment, doctorId: DEMO_DOCTOR_ID } },
      { upsert: true },
    );
  }

  console.info({
    event: 'seed.completed',
    doctorEmail: DEMO_DOCTOR_EMAIL,
    doctorId: DEMO_DOCTOR_ID,
    patients: seedPatients.length,
    appointments: seedAppointments.length,
  });
}

seed()
  .catch((error) => {
    logSeedError('seed.failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
