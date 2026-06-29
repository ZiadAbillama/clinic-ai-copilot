import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
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
    appointmentId: {
      type: String,
      default: null,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
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

noteSchema.index({ doctorId: 1, id: 1 }, { unique: true });
noteSchema.index({ doctorId: 1, patientId: 1, createdAt: -1 });
noteSchema.index({ doctorId: 1, archivedAt: 1, createdAt: -1, id: 1 });
noteSchema.index({ doctorId: 1, patientId: 1, archivedAt: 1, createdAt: -1, id: 1 });
noteSchema.index({ doctorId: 1, appointmentId: 1, archivedAt: 1, createdAt: -1, id: 1 });
noteSchema.index({ text: 'text' });

export const Note = mongoose.models.Note || mongoose.model('Note', noteSchema);
