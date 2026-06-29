import mongoose from 'mongoose';
import { visitStatuses } from '../statuses.js';

function getTodayDateString() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

const appointmentSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      required: true,
      index: true,
    },
    id: {
      type: String,
      required: true,
    },
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    scheduledDate: {
      type: String,
      default: getTodayDateString,
    },
    scheduledTime: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      default: 'Scheduled',
      enum: visitStatuses,
    },
    archivedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

appointmentSchema.index({ doctorId: 1, id: 1 }, { unique: true });
appointmentSchema.index({ doctorId: 1, scheduledDate: 1, scheduledTime: 1 });
appointmentSchema.index({
  doctorId: 1,
  archivedAt: 1,
  scheduledDate: -1,
  scheduledTime: 1,
  id: 1,
});
appointmentSchema.index({
  doctorId: 1,
  patientId: 1,
  archivedAt: 1,
  scheduledDate: -1,
  scheduledTime: -1,
  id: 1,
});

export const Appointment =
  mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
