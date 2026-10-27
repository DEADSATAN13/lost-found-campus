import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
    },
    type: {
      type: String,
      required: [true, 'Post type is required'],
      enum: {
        values: ['lost', 'found', 'trade'],
        message: 'Type must be lost, found, or trade',
      },
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'archived'],
      default: 'active',
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    photoUrl: {
      type: String,
      maxlength: [500, 'Photo URL cannot exceed 500 characters'],
      default: '',
    },
    verificationHint: {
      type: String,
      maxlength: [200, 'Verification hint cannot exceed 200 characters'],
      default: '',
    },
    expiresAt: {
      type: Date,
      // Default to 30 days from creation
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient sorting and filtering by active status
PostSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Post || mongoose.model('Post', PostSchema);
