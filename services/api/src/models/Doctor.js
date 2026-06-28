import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

doctorSchema.index({ id: 1 }, { unique: true });
doctorSchema.index({ email: 1 }, { unique: true });

export const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
