import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  filename: {
    type: String,
    required: true,
  },
  originalName: String,
  path: {
    type: String,
    required: true,
  },
  url: String,
  mimeType: String,
  size: Number,
  dimensions: {
    width: Number,
    height: Number,
  },
  category: {
    type: String,
    enum: ['general', 'ceremony', 'presentations', 'networking', 'awards', 'behind-scenes'],
    default: 'general',
  },
  tags: [String],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadedByName: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  rejectionReason: String,
  metadata: {
    exif: mongoose.Schema.Types.Mixed,
    camera: String,
    location: String,
    eventDate: Date,
  },
  views: {
    type: Number,
    default: 0,
  },
  downloads: {
    type: Number,
    default: 0,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  // Legacy fields for backward compatibility
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  },
  imageUrl: String,
  approved: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for search
gallerySchema.index({ title: 'text', description: 'text', tags: 'text' });

const Gallery = mongoose.model('Gallery', gallerySchema);

export default Gallery;
