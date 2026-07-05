// Seed-only demo records; runtime API routes read from MongoDB, not this module.

import { visitStatus } from './statuses.js';

function getTodayDateString() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export const seedPatients = [
  {
    id: 'P-1024',
    name: 'Maya Haddad',
    dob: '1989-04-18',
    contact: '+961 70 102 400',
    reason: 'Follow-up consultation',
    appointment: '08:40',
    status: visitStatus.checkedIn,
  },
  {
    id: 'P-1025',
    name: 'Karim Nassar',
    dob: '1978-11-03',
    contact: '+961 71 204 510',
    reason: 'New patient intake',
    appointment: '09:05',
    status: visitStatus.needsVitals,
  },
  {
    id: 'P-1026',
    name: 'Omar Saad',
    dob: '1966-01-22',
    contact: '+961 76 889 120',
    reason: 'Chest discomfort note',
    appointment: '09:25',
    status: visitStatus.doctorReview,
  },
  {
    id: 'P-1027',
    name: 'Ziad Abillama',
    dob: '2006-01-13',
    contact: '+961 71 665 965',
    reason: 'Internship Assistance',
    appointment: '10:30',
    status: visitStatus.checkedIn,
  },
];

const today = getTodayDateString();

export const seedAppointments = seedPatients.map((patient) => ({
  id: `A-${patient.id}`,
  patientId: patient.id,
  scheduledDate: today,
  scheduledTime: patient.appointment,
  reason: patient.reason,
  status: patient.status,
}));
