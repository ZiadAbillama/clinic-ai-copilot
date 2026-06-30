import mongoose from 'mongoose';

const aiSummarySchema = new mongoose.Schema(
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
    noteId: {
      type: String,
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    shortSummary: {
      type: String,
      default: '',
      trim: true,
    },
    keySymptoms: {
      type: String,
      default: '',
      trim: true,
    },
    assessment: {
      type: String,
      default: '',
      trim: true,
    },
    plan: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'rejected'],
      default: 'draft',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

aiSummarySchema.index({ doctorId: 1, id: 1 }, { unique: true });
aiSummarySchema.index({ doctorId: 1, noteId: 1, updatedAt: -1 });

export const AiSummary = mongoose.models.AiSummary || mongoose.model('AiSummary', aiSummarySchema);
