import mongoose from 'mongoose';

const InterestSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index prevents multiple responses from the same student on a single post
InterestSchema.index({ post: 1, student: 1 }, { unique: true });

export default mongoose.models.Interest || mongoose.model('Interest', InterestSchema);
