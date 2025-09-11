import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  evaluatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  posterSubmissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gallery',
    required: true
  },
  scores: {
    innovation: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    technicalComplexity: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    presentation: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    feasibility: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    }
  },
  comments: {
    type: String,
    trim: true
  },
  totalScore: {
    type: Number,
    default: function() {
      const scores = this.scores;
      return (scores.innovation + scores.technicalComplexity + 
              scores.presentation + scores.feasibility) / 4;
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for efficient queries
evaluationSchema.index({ teamId: 1, evaluatorId: 1 });
evaluationSchema.index({ posterSubmissionId: 1 });

// Middleware to update totalScore before saving
evaluationSchema.pre('save', function(next) {
  if (this.scores) {
    this.totalScore = (
      this.scores.innovation +
      this.scores.technicalComplexity +
      this.scores.presentation +
      this.scores.feasibility
    ) / 4;
  }
  next();
});

const Evaluation = mongoose.model('Evaluation', evaluationSchema);

export default Evaluation;
