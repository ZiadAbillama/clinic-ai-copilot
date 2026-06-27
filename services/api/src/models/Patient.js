import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: String,
      default: '',
    },
    contact: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: '',
    },
    appointment: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      default: 'Scheduled',
    },
    lastVisit: {
      type: String,
      default: '',
    },
    noteCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

patientSchema.index({ doctorId: 1, id: 1 }, { unique: true });

export const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
