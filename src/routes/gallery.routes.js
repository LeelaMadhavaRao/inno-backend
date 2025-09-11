import express from 'express';
import { protect, isAdmin } from '../middleware/auth.js';
import {
  getGalleryPhotos,
  uploadPhotos,
  getPhoto,
  approvePhoto,
  deletePhoto,
  getGalleryStats,
  
  // Legacy support
  getAllGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  approveGalleryItem
} from '../controllers/gallery.controller.js';

const router = express.Router();

// Public routes
router.get('/', getGalleryPhotos);
router.get('/:id', getPhoto);

// Protected routes for teams (any authenticated user)
router.post('/team/upload', protect, uploadPhotos);

// Protected routes (Admin only)
router.post('/upload', protect, isAdmin, uploadPhotos);
router.get('/admin/stats', protect, isAdmin, getGalleryStats);
router.put('/:id/approve', protect, isAdmin, approvePhoto);
router.delete('/:id', protect, isAdmin, deletePhoto);

// Legacy routes for backward compatibility
router.get('/admin/all', protect, isAdmin, getAllGalleryItems);
router.post('/create', protect, isAdmin, createGalleryItem);
router.put('/update/:id', protect, isAdmin, updateGalleryItem);
router.delete('/delete/:id', protect, isAdmin, deleteGalleryItem);
router.put('/approve/:id', protect, isAdmin, approveGalleryItem);

export default router;
