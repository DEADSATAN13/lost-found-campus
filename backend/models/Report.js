import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post reference is required'],
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter reference is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      enum: {
        values: ['spam', 'inappropriate', 'scam', 'other'],
        message: 'Reason must be spam, inappropriate, scam, or other',
      },
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, 'Note cannot exceed 200 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'dismissed'],
      default: 'open',
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index prevents a user from filing multiple reports on the same post
ReportSchema.index({ post: 1, reporter: 1 }, { unique: true });

export default mongoose.models.Report || mongoose.model('Report', ReportSchema);
