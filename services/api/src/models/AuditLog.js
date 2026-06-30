import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
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
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      required: true,
      trim: true,
    },
    targetId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({ doctorId: 1, id: 1 }, { unique: true });
auditLogSchema.index({ doctorId: 1, targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ doctorId: 1, createdAt: -1, id: 1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
