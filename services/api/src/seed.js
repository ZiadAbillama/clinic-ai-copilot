import './env.js';
import { DEMO_DOCTOR_ID } from './config.js';
import { seedPatients } from './data.js';
import { connectDatabase, disconnectDatabase } from './db.js';
import { Patient } from './models/Patient.js';

async function seed() {
  await connectDatabase();

  for (const patient of seedPatients) {
    await Patient.updateOne(
      { doctorId: DEMO_DOCTOR_ID, id: patient.id },
      { $set: { ...patient, doctorId: DEMO_DOCTOR_ID } },
      { upsert: true },
    );
  }

  console.log(`Seeded ${seedPatients.length} patients for doctor ${DEMO_DOCTOR_ID}.`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
