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

async function seed() {
  await connectDatabase();
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

  console.log(`Seeded doctor ${DEMO_DOCTOR_EMAIL}.`);
  console.log(`Seeded ${seedPatients.length} patients for doctor ${DEMO_DOCTOR_ID}.`);
  console.log(`Seeded ${seedAppointments.length} appointments for doctor ${DEMO_DOCTOR_ID}.`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
