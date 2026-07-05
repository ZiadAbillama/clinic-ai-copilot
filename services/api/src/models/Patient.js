import mongoose from 'mongoose';
import { visitStatus, visitStatuses } from '../statuses.js';

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
      default: visitStatus.scheduled,
      enum: visitStatuses,
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

patientSchema.index({ doctorId: 1, id: 1 }, { unique: true });
patientSchema.index({ doctorId: 1, archivedAt: 1, appointment: 1, id: 1 });

export const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
