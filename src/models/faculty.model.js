import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema({
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
  department: {
    type: String,
    required: true,
  },
  designation: {
    type: String,
    required: true,
  },
  specialization: String,
  experience: String,
  qualifications: [String],
  researchAreas: [String],
  publications: [{
    title: String,
    year: Number,
    journal: String,
    url: String,
  }],
  contactDetails: {
    phone: String,
    office: String,
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
  role: {
    type: String,
    enum: ['coordinator', 'mentor', 'judge', 'advisor'],
    default: 'mentor',
  },
  assignedTeams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  }],
}, {
  timestamps: true,
});

const Faculty = mongoose.model('Faculty', facultySchema);

export default Faculty;
