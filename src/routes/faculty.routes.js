import express from 'express';
import { protect, isFaculty } from '../middleware/auth.js';
import { getEvaluationResults, getFacultyStats } from '../controllers/faculty.controller.js';

const router = express.Router();

// Apply protection and faculty check to all routes
router.use(protect);
router.use(isFaculty);

// Faculty specific routes
router.get('/evaluation-results', getEvaluationResults);
router.get('/stats', getFacultyStats);

export default router;
