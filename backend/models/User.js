import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      // Sparse index ensures multiple null/undefined values don't violate uniqueness
      unique: true,
      sparse: true,
      match: [/^[6-9]\d{9}$/, 'Phone must be a valid 10-digit Indian mobile number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    points: {
      type: Number,
      default: 0,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verifyCodeHash: {
      type: String,
    },
    verifyCodeExpiry: {
      type: Date,
    },
    verifyCodeSentAt: {
      type: Date,
    },
    verifyAttempts: {
      type: Number,
      default: 0,
    },
    termsAcceptedAt: {
      type: Date,
    },
    resetToken: {
      type: String,
    },
    resetTokenExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
