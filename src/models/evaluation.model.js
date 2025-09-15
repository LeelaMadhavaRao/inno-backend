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
  criteria: {
    problemStatement: {
      type: Number,
      required: true,
      min: 0,
      max: 25
    },
    teamInvolvement: {
      type: Number,
      required: true,
      min: 0,
      max: 25
    },
    leanCanvas: {
      type: Number,
      required: true,
      min: 0,
      max: 25
    },
    prototypeQuality: {
      type: Number,
      required: true,
      min: 0,
      max: 25
    }
  },
  feedback: {
    type: String,
    trim: true,
    default: ''
  },
  totalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: function() {
      if (this.criteria) {
        return this.criteria.problemStatement + 
               this.criteria.teamInvolvement + 
               this.criteria.leanCanvas + 
               this.criteria.prototypeQuality;
      }
      return 0;
    }
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed'],
    default: 'draft'
  },
  submittedAt: {
    type: Date,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Compound index to ensure one evaluation per evaluator per team
evaluationSchema.index({ teamId: 1, evaluatorId: 1 }, { unique: true });

// Index for efficient queries
evaluationSchema.index({ status: 1 });
evaluationSchema.index({ submittedAt: 1 });
evaluationSchema.index({ totalScore: -1 });

// Middleware to calculate totalScore before saving
evaluationSchema.pre('save', function(next) {
  if (this.criteria && this.isModified('criteria')) {
    this.totalScore = 
      this.criteria.problemStatement + 
      this.criteria.teamInvolvement + 
      this.criteria.leanCanvas + 
      this.criteria.prototypeQuality;
  }
  
  // Set submittedAt when status changes to submitted
  if (this.isModified('status') && this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  
  next();
});

// Virtual for percentage score
evaluationSchema.virtual('percentageScore').get(function() {
  return (this.totalScore / 100) * 100;
});

// Method to get detailed breakdown
evaluationSchema.methods.getBreakdown = function() {
  return {
    criteria: this.criteria,
    totalScore: this.totalScore,
    percentageScore: this.percentageScore,
    status: this.status,
    submittedAt: this.submittedAt,
    feedback: this.feedback
  };
};

// Static method to get team statistics
evaluationSchema.statics.getTeamStatistics = async function(teamId) {
  const evaluations = await this.find({ teamId, status: 'submitted' });
  
  if (evaluations.length === 0) {
    return {
      totalEvaluations: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      criteriaAverages: {}
    };
  }
  
  const totalScore = evaluations.reduce((sum, evaluation) => sum + evaluation.totalScore, 0);
  const scores = evaluations.map(evaluation => evaluation.totalScore);
  
  const criteriaAverages = {
    problemStatement: evaluations.reduce((sum, evaluation) => sum + evaluation.criteria.problemStatement, 0) / evaluations.length,
    teamInvolvement: evaluations.reduce((sum, evaluation) => sum + evaluation.criteria.teamInvolvement, 0) / evaluations.length,
    leanCanvas: evaluations.reduce((sum, evaluation) => sum + evaluation.criteria.leanCanvas, 0) / evaluations.length,
    prototypeQuality: evaluations.reduce((sum, evaluation) => sum + evaluation.criteria.prototypeQuality, 0) / evaluations.length
  };
  
  return {
    totalEvaluations: evaluations.length,
    averageScore: totalScore / evaluations.length,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    criteriaAverages
  };
};

const Evaluation = mongoose.model('Evaluation', evaluationSchema);

export default Evaluation;
