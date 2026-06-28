import mongoose from 'mongoose';

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
      default: '2026-06-28',
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
    },
  },
  {
    timestamps: true,
  },
);

appointmentSchema.index({ doctorId: 1, id: 1 }, { unique: true });
appointmentSchema.index({ doctorId: 1, scheduledDate: 1, scheduledTime: 1 });

export const Appointment =
  mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
