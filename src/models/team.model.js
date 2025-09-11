import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    unique: true,
  },
  teamLeader: {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: false,
      default: '',
    },
  },
  teamMembers: [{
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
      default: '',
    },
    role: {
      type: String,
      default: 'member',
    },
  }],
  projectDetails: {
    title: String,
    description: String,
    category: String,
    techStack: [String],
  },
  credentials: {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isPasswordChanged: {
      type: Boolean,
      default: false,
    },
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'approved', 'rejected'],
    default: 'active',
  },
  invitationSent: {
    type: Boolean,
    default: false,
  },
  invitationSentAt: Date,
  lastLoginAt: Date,
  evaluationStatus: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
  },
  evaluationScores: [{
    evaluatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    evaluatorName: String,
    scores: {
      innovation: { type: Number, min: 0, max: 100 },
      technical: { type: Number, min: 0, max: 100 },
      business: { type: Number, min: 0, max: 100 },
      presentation: { type: Number, min: 0, max: 100 },
      feasibility: { type: Number, min: 0, max: 100 },
    },
    totalScore: { type: Number, min: 0, max: 100 },
    feedback: String,
    submittedAt: Date,
  }],
  finalRank: Number,
  finalScore: Number,
}, {
  timestamps: true,
});

// Virtual for team size
teamSchema.virtual('teamSize').get(function() {
  return this.teamMembers.length + 1; // +1 for team leader
});

// Method to calculate average score
teamSchema.methods.calculateAverageScore = function() {
  if (this.evaluationScores.length === 0) return 0;
  
  const totalScore = this.evaluationScores.reduce((sum, evaluation) => {
    return sum + (evaluation.totalScore || 0);
  }, 0);
  
  return totalScore / this.evaluationScores.length;
};

// Method to check if evaluation is complete
teamSchema.methods.isEvaluationComplete = function(totalEvaluators) {
  return this.evaluationScores.length >= totalEvaluators;
};

const Team = mongoose.model('Team', teamSchema);

export default Team;
