import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  subject: {
    type: String,
    required: true,
  },
  template: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['team_invitation', 'faculty_invitation', 'evaluator_invitation', 'evaluation_reminder', 'results_announcement', 'general'],
    required: true,
  },
  variables: [{
    name: String,
    description: String,
    required: Boolean,
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'active',
  },
}, {
  timestamps: true,
});

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);

export default EmailTemplate;
