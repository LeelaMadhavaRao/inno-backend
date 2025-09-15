import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  // Evaluator endpoints
  getEvaluatorTeams,
  getTeamForEvaluation,
  submitEvaluation,
  updateEvaluation,
  
  // Admin endpoints
  getEvaluationOverview,
  getTeamEvaluationDetails,
  releaseResults,
  
  // Results endpoints
  getTeamResults,
  getFacultyResults,
  getEvaluationCriteria
} from '../controllers/evaluation.controller.js';

const router = express.Router();

// ==================== EVALUATOR ROUTES ====================
// Get evaluator's assigned teams
router.get('/evaluator/teams', protect, authorize('evaluator'), getEvaluatorTeams);

// Get specific team for evaluation
router.get('/team/:teamId', protect, authorize('evaluator'), getTeamForEvaluation);

// Submit evaluation
router.post('/submit', protect, authorize('evaluator'), submitEvaluation);

// Update existing evaluation
router.put('/:evaluationId', protect, authorize('evaluator'), updateEvaluation);

// ==================== ADMIN ROUTES ====================
// Get evaluation overview for admin
router.get('/admin/overview', protect, authorize('admin'), getEvaluationOverview);

// Get detailed evaluations for specific team
router.get('/admin/team/:teamId', protect, authorize('admin'), getTeamEvaluationDetails);

// Release results
router.post('/admin/release-results', protect, authorize('admin'), releaseResults);

// ==================== RESULTS ROUTES ====================
// Get results for team view
router.get('/results/team', protect, authorize('team'), getTeamResults);

// Get results for faculty view
router.get('/results/faculty', protect, authorize('faculty'), getFacultyResults);

// ==================== GENERAL ROUTES ====================
// Get evaluation criteria
router.get('/criteria', protect, getEvaluationCriteria);

export default router;
