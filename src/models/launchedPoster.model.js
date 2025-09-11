import mongoose from 'mongoose';

const launchedPosterSchema = mongoose.Schema(
  {
    posterId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    theme: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    organizer: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'paused'],
      default: 'active',
    },
    config: {
      scheduledTime: {
        type: Date,
        default: Date.now,
      },
      duration: {
        type: Number,
        default: 24, // hours
      },
      targetAudience: {
        type: String,
        enum: ['all', 'students', 'faculty', 'evaluators'],
        default: 'all',
      },
      message: {
        type: String,
        default: '',
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
    },
    launchedAt: {
      type: Date,
      default: Date.now,
    },
    launchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    analytics: {
      views: {
        type: Number,
        default: 0,
      },
      interactions: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
launchedPosterSchema.index({ posterId: 1 });
launchedPosterSchema.index({ status: 1 });
launchedPosterSchema.index({ isVisible: 1 });
launchedPosterSchema.index({ launchedAt: -1 });

const LaunchedPoster = mongoose.model('LaunchedPoster', launchedPosterSchema);

export default LaunchedPoster;
