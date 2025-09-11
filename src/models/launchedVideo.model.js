import mongoose from 'mongoose';

const launchedVideoSchema = mongoose.Schema(
  {
    videoId: {
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
    videoUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: false,
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
    duration: {
      type: String,
      required: false,
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
      displayDuration: {
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
      autoPlay: {
        type: Boolean,
        default: true,
      },
      volume: {
        type: Number,
        default: 0.5,
        min: 0,
        max: 1,
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
      watchTime: {
        type: Number,
        default: 0, // in seconds
      },
      interactions: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
      completionRate: {
        type: Number,
        default: 0, // percentage
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
launchedVideoSchema.index({ videoId: 1 });
launchedVideoSchema.index({ launchedBy: 1 });
launchedVideoSchema.index({ status: 1 });
launchedVideoSchema.index({ isVisible: 1 });
launchedVideoSchema.index({ 'config.targetAudience': 1 });
launchedVideoSchema.index({ launchedAt: -1 });

// Virtual for launch age in hours
launchedVideoSchema.virtual('launchAgeHours').get(function() {
  return Math.floor((Date.now() - this.launchedAt) / (1000 * 60 * 60));
});

// Virtual for display expiry
launchedVideoSchema.virtual('isExpired').get(function() {
  return this.launchAgeHours > this.config.displayDuration;
});

// Method to increment views
launchedVideoSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  return this.save();
};

// Method to add watch time
launchedVideoSchema.methods.addWatchTime = function(seconds) {
  this.analytics.watchTime += seconds;
  return this.save();
};

// Method to increment interactions
launchedVideoSchema.methods.incrementInteractions = function() {
  this.analytics.interactions += 1;
  return this.save();
};

// Static method to get active videos
launchedVideoSchema.statics.getActiveVideos = function() {
  return this.find({ 
    status: 'active', 
    isVisible: true 
  }).populate('launchedBy', 'name email');
};

// Static method to get videos by target audience
launchedVideoSchema.statics.getVideosByAudience = function(audience) {
  return this.find({ 
    status: 'active', 
    isVisible: true,
    'config.targetAudience': { $in: [audience, 'all'] }
  }).populate('launchedBy', 'name email');
};

const LaunchedVideo = mongoose.model('LaunchedVideo', launchedVideoSchema);

export default LaunchedVideo;
