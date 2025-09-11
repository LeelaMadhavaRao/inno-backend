import mongoose from 'mongoose';

const evaluatorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organization: {
    type: String,
    required: true,
  },
  designation: String,
  expertise: [String],
  experience: {
    years: Number,
    description: String,
  },
  type: {
    type: String,
    enum: ['internal', 'external', 'industry', 'academic'],
    required: true,
  },
  qualifications: [String],
  linkedIn: String,
  portfolio: String,
  contactDetails: {
    phone: String,
    alternateEmail: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active',
  },
  invitationSent: {
    type: Boolean,
    default: false,
  },
  invitationSentAt: Date,
  lastLoginAt: Date,
  assignedTeams: [{
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    assignedAt: Date,
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed'],
      default: 'assigned',
    },
  }],
  evaluationCriteria: {
    innovation: { weight: Number, maxScore: Number },
    technical: { weight: Number, maxScore: Number },
    business: { weight: Number, maxScore: Number },
    presentation: { weight: Number, maxScore: Number },
    feasibility: { weight: Number, maxScore: Number },
  },
  evaluationsCompleted: {
    type: Number,
    default: 0,
  },
  totalEvaluationsAssigned: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Virtual for completion rate
evaluatorSchema.virtual('completionRate').get(function() {
  if (this.totalEvaluationsAssigned === 0) return 0;
  return (this.evaluationsCompleted / this.totalEvaluationsAssigned) * 100;
});

const Evaluator = mongoose.model('Evaluator', evaluatorSchema);

export default Evaluator;
