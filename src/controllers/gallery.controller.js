import asyncHandler from 'express-async-handler';
import Gallery from '../models/gallery.model.js';
import fileUploadService from '../services/fileUploadService.js';
import path from 'path';
import fs from 'fs';

// @desc    Get all gallery photos
// @route   GET /api/gallery
// @access  Public
export const getGalleryPhotos = asyncHandler(async (req, res) => {
  const { category, status, limit = 50, page = 1 } = req.query;
  
  let filter = {};
  
  // Apply filters
  if (category && category !== 'all') {
    filter.category = category;
  }
  
  if (status && status !== 'all') {
    filter.status = status;
  } else {
    // For public access, show both approved and pending photos
    // This allows all users to see gallery content
    if (!req.user || req.user.role !== 'admin') {
      filter.status = { $in: ['approved', 'pending'] };
    }
  }

  const photos = await Gallery.find(filter)
    .populate('uploadedBy', 'name email')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const totalPhotos = await Gallery.countDocuments(filter);

  // If no photos exist, return sample data for demo
  if (photos.length === 0) {
    const sampleData = [
      {
        _id: 'sample1',
        title: 'Innovation Showcase 2025',
        description: 'Teams presenting their innovative solutions and cutting-edge projects',
        url: '/team-photo-of-4-students-working-together.jpg',
        images: ['/team-photo-of-4-students-working-together.jpg'],
        category: 'presentations',
        status: 'approved',
        teamName: 'Demo Team Alpha',
        uploadDate: new Date().toISOString(),
        uploadedBy: { name: 'Event Admin', email: 'admin@innoverse.com' }
      },
      {
        _id: 'sample2',
        title: 'AI Learning Platform Demo',
        description: 'Advanced AI and machine learning project demonstrations with real-world applications',
        url: '/ai-learning-platform-demo-screenshot.jpg',
        images: ['/ai-learning-platform-demo-screenshot.jpg'],
        category: 'general',
        status: 'approved',
        teamName: 'AI Innovators',
        uploadDate: new Date().toISOString(),
        uploadedBy: { name: 'Event Admin', email: 'admin@innoverse.com' }
      },
      {
        _id: 'sample3',
        title: 'Technical Architecture',
        description: 'Comprehensive technical architecture diagrams showcasing innovative system designs',
        url: '/technical-architecture-diagram-with-ai-components.jpg',
        images: ['/technical-architecture-diagram-with-ai-components.jpg'],
        category: 'ceremony',
        status: 'approved',
        teamName: 'System Architects',
        uploadDate: new Date().toISOString(),
        uploadedBy: { name: 'Event Admin', email: 'admin@innoverse.com' }
      }
    ];
    
    res.json({
      photos: sampleData,
      currentPage: parseInt(page),
      totalPages: 1,
      totalPhotos: sampleData.length,
      hasNextPage: false,
      hasPrevPage: false
    });
    return;
  }

  // Transform actual data to expected format for frontend compatibility
  const transformedPhotos = photos.map(photo => ({
    _id: photo._id,
    title: photo.title,
    description: photo.description,
    url: photo.url,
    images: [photo.url],
    category: photo.category,
    status: photo.status,
    teamName: photo.uploadedBy?.name || 'Unknown Team',
    uploadDate: photo.createdAt,
    uploadedBy: photo.uploadedBy,
    size: photo.size,
    dimensions: photo.dimensions,
    tags: photo.tags,
    approvedBy: photo.approvedBy,
    approvedAt: photo.approvedAt
  }));

  res.json({
    photos: transformedPhotos,
    currentPage: parseInt(page),
    totalPages: Math.ceil(totalPhotos / parseInt(limit)),
    totalPhotos,
    hasNextPage: parseInt(page) < Math.ceil(totalPhotos / parseInt(limit)),
    hasPrevPage: parseInt(page) > 1
  });
});

// @desc    Upload multiple photos
// @route   POST /api/gallery/upload
// @access  Private/Admin
export const uploadPhotos = asyncHandler(async (req, res) => {
  // Use multer middleware for multiple file upload
  fileUploadService.uploadGallery.array('photos', 10)(req, res, async (err) => {
    if (err) {
      res.status(400);
      throw new Error(err.message);
    }

    if (!req.files || req.files.length === 0) {
      res.status(400);
      throw new Error('No files uploaded');
    }

    const { title, description, category = 'general', tags } = req.body;
    const uploadedPhotos = [];

    try {
      for (const file of req.files) {
        // Get image metadata
        const metadata = await fileUploadService.getImageMetadata(file.path);
        
        // Generate thumbnail
        const thumbnailPath = path.join(
          path.dirname(file.path), 
          'thumb_' + file.filename
        );
        await fileUploadService.generateThumbnail(file.path, thumbnailPath);

        // Create gallery entry
        const photo = await Gallery.create({
          title: title || file.originalname,
          description: description || '',
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          url: fileUploadService.getFileUrl(file.filename, 'gallery'),
          mimeType: file.mimetype,
          size: file.size,
          dimensions: metadata ? {
            width: metadata.width,
            height: metadata.height
          } : undefined,
          category,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          uploadedBy: req.user._id,
          uploadedByName: req.user.name,
          status: req.user.role === 'admin' ? 'approved' : 'pending', // Auto-approve only for admin uploads
          approvedBy: req.user.role === 'admin' ? req.user._id : null,
          approvedAt: req.user.role === 'admin' ? new Date() : null,
          metadata: {
            camera: metadata?.exif?.Make || 'Unknown',
            eventDate: new Date()
          }
        });

        uploadedPhotos.push(photo);
      }

      res.status(201).json({
        message: `Successfully uploaded ${uploadedPhotos.length} photo(s)`,
        photos: uploadedPhotos
      });

    } catch (error) {
      // Clean up uploaded files on error
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      res.status(500);
      throw new Error('Error processing uploaded photos: ' + error.message);
    }
  });
});

// @desc    Get single photo
// @route   GET /api/gallery/:id
// @access  Public
export const getPhoto = asyncHandler(async (req, res) => {
  const photo = await Gallery.findById(req.params.id)
    .populate('uploadedBy', 'name email')
    .populate('approvedBy', 'name');

  if (!photo) {
    res.status(404);
    throw new Error('Photo not found');
  }

  // Check if photo is public or user has permission
  if (photo.status !== 'approved' || !photo.isPublic) {
    if (!req.user || (req.user.role !== 'admin' && req.user._id.toString() !== photo.uploadedBy._id.toString())) {
      res.status(403);
      throw new Error('Access denied');
    }
  }

  // Increment view count
  photo.views += 1;
  await photo.save();

  res.json(photo);
});

// @desc    Approve photo
// @route   PUT /api/gallery/:id/approve
// @access  Private/Admin
export const approvePhoto = asyncHandler(async (req, res) => {
  const photo = await Gallery.findById(req.params.id);

  if (!photo) {
    res.status(404);
    throw new Error('Photo not found');
  }

  photo.status = 'approved';
  photo.approvedBy = req.user._id;
  photo.approvedAt = new Date();
  await photo.save();

  res.json({
    message: 'Photo approved successfully',
    photo
  });
});

// @desc    Delete photo
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
export const deletePhoto = asyncHandler(async (req, res) => {
  const photo = await Gallery.findById(req.params.id);

  if (!photo) {
    res.status(404);
    throw new Error('Photo not found');
  }

  // Delete file from filesystem
  if (fs.existsSync(photo.path)) {
    fs.unlinkSync(photo.path);
  }

  // Delete thumbnail if exists
  const thumbnailPath = path.join(
    path.dirname(photo.path), 
    'thumb_' + photo.filename
  );
  if (fs.existsSync(thumbnailPath)) {
    fs.unlinkSync(thumbnailPath);
  }

  await photo.deleteOne();

  res.json({ message: 'Photo deleted successfully' });
});

// @desc    Get gallery statistics
// @route   GET /api/gallery/stats
// @access  Private/Admin
export const getGalleryStats = asyncHandler(async (req, res) => {
  const [
    totalPhotos,
    approvedPhotos,
    pendingPhotos,
    rejectedPhotos,
    categoryCounts
  ] = await Promise.all([
    Gallery.countDocuments(),
    Gallery.countDocuments({ status: 'approved' }),
    Gallery.countDocuments({ status: 'pending' }),
    Gallery.countDocuments({ status: 'rejected' }),
    Gallery.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  res.json({
    stats: {
      totalPhotos,
      approvedPhotos,
      pendingPhotos,
      rejectedPhotos,
      categories: categoryCounts.length
    },
    categoryCounts
  });
});

// Legacy functions for backward compatibility
export const getAllGalleryItems = asyncHandler(async (req, res) => {
  // Return a consistent format with sample data if no items exist
  try {
    const photos = await Gallery.find({ status: { $in: ['approved', 'pending'] } })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    // If no photos exist, return sample data for demo
    if (photos.length === 0) {
      const sampleData = [
        {
          _id: 'sample1',
          title: 'Innovation Showcase 2025',
          description: 'Teams presenting their innovative solutions',
          url: '/team-photo-of-4-students-working-together.jpg',
          images: ['/team-photo-of-4-students-working-together.jpg'],
          category: 'presentations',
          status: 'approved',
          teamName: 'Demo Team',
          uploadDate: new Date().toISOString(),
          uploadedBy: { name: 'Admin', email: 'admin@innoverse.com' }
        },
        {
          _id: 'sample2',
          title: 'Technical Architecture Demo',
          description: 'AI and machine learning project demonstrations',
          url: '/technical-architecture-diagram-with-ai-components.jpg',
          images: ['/technical-architecture-diagram-with-ai-components.jpg'],
          category: 'general',
          status: 'approved',
          teamName: 'Tech Innovators',
          uploadDate: new Date().toISOString(),
          uploadedBy: { name: 'Admin', email: 'admin@innoverse.com' }
        }
      ];
      
      res.json(sampleData);
      return;
    }

    // Transform actual data to expected format
    const transformedPhotos = photos.map(photo => ({
      _id: photo._id,
      title: photo.title,
      description: photo.description,
      url: photo.url,
      images: [photo.url],
      category: photo.category,
      status: photo.status,
      teamName: photo.uploadedBy?.name || 'Unknown Team',
      uploadDate: photo.createdAt,
      uploadedBy: photo.uploadedBy
    }));

    res.json(transformedPhotos);
  } catch (error) {
    console.error('Gallery fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
export const getGalleryItemById = getPhoto;
export const createGalleryItem = uploadPhotos;
export const updateGalleryItem = approvePhoto;
export const deleteGalleryItem = deletePhoto;
export const approveGalleryItem = approvePhoto;
