import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

class FileUploadService {
  constructor() {
    this.uploadDir = 'uploads';
    this.galleryDir = path.join(this.uploadDir, 'gallery');
    this.profileDir = path.join(this.uploadDir, 'profiles');
    this.documentsDir = path.join(this.uploadDir, 'documents');
    
    this.ensureDirectoriesExist();
  }

  ensureDirectoriesExist() {
    [this.uploadDir, this.galleryDir, this.profileDir, this.documentsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Gallery storage configuration
  galleryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, this.galleryDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `gallery-${uniqueSuffix}${ext}`);
    }
  });

  // Profile storage configuration
  profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, this.profileDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `profile-${uniqueSuffix}${ext}`);
    }
  });

  // File filter for images
  imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  };

  // File filter for documents
  documentFilter = (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt|rtf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only document files are allowed!'), false);
    }
  };

  // Gallery upload middleware
  uploadGallery = multer({
    storage: this.galleryStorage,
    fileFilter: this.imageFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  // Profile upload middleware
  uploadProfile = multer({
    storage: this.profileStorage,
    fileFilter: this.imageFilter,
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB limit
    },
  });

  // Process image with Sharp
  async processImage(inputPath, outputPath, options = {}) {
    try {
      const {
        width = 1920,
        height = 1080,
        quality = 80,
        format = 'jpeg'
      } = options;

      const imageInfo = await sharp(inputPath)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality })
        .toFile(outputPath);

      return {
        success: true,
        info: imageInfo,
        path: outputPath
      };
    } catch (error) {
      console.error('Image processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get image metadata
  async getImageMetadata(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        channels: metadata.channels,
        hasProfile: metadata.hasProfile,
        hasAlpha: metadata.hasAlpha
      };
    } catch (error) {
      console.error('Metadata extraction error:', error);
      return null;
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (error) {
      console.error('File deletion error:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate thumbnail
  async generateThumbnail(inputPath, outputPath, size = 300) {
    try {
      await sharp(inputPath)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(outputPath);
      
      return { success: true, path: outputPath };
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get file URL
  getFileUrl(filename, type = 'gallery') {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}/uploads/${type}/${filename}`;
  }
}

export default new FileUploadService();
