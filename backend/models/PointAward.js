import mongoose from 'mongoose';

const PointAwardSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post reference is required'],
      // Unique index on post guarantees points can never be awarded more than once for the same post
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    points: {
      type: Number,
      required: [true, 'Points value is required'],
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PointAward || mongoose.model('PointAward', PointAwardSchema);
