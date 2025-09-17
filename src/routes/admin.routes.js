import express from 'express';
import { protect, isAdmin, authorize } from '../middleware/auth.js';
import {
  getDashboardStats,
  
  // Team Management
  getTeams,
  createTeam,
  resendTeamInvitation,
  updateTeam,
  deleteTeam,
  
  // Faculty Management
  getFaculty,
  createFaculty,
  resendFacultyInvitation,
  updateFaculty,
  deleteFaculty,
  
  // Evaluator Management
  getEvaluators,
  createEvaluator,
  updateEvaluator,
  deleteEvaluator,
  resendEvaluatorInvitation,
  assignTeamsToEvaluator,
  
  // Evaluation Management
  getEvaluations,
  getTeamEvaluations,
  getResultsStatus,
  releaseResults,
  retractResults,
  
  // User Management
  getUsers,
  deleteUser,
  updateUser,
  
  // Poster Launch Management
  getPosters,
  launchPoster,
  getLaunchedPosters,
  stopPosterLaunch,
  updatePosterLaunch,
  resetAllPosterLaunches,
  
  // Video Launch Management
  getPromotionVideos,
  launchPromotionVideo,
  getLaunchedVideos,
  stopVideoLaunch,
  updateVideoLaunch,
  resetAllVideoLaunches,
  resetAllLaunches
} from '../controllers/admin.controller.js';

const router = express.Router();

// Temporary evaluator endpoints (must be BEFORE admin middleware)
// These endpoints are for evaluators, not admins, so they don't need isAdmin middleware
const evaluatorRouter = express.Router();
evaluatorRouter.use(protect);
evaluatorRouter.use(authorize('evaluator'));

evaluatorRouter.get('/profile', async (req, res) => {
  try {
    const { getEvaluatorProfile } = await import('../controllers/evaluation.controller.js');
    return getEvaluatorProfile(req, res);
  } catch (error) {
    console.error('Error in evaluator profile endpoint:', error);
    res.status(500).json({ message: 'Profile endpoint not available', error: error.message });
  }
});

evaluatorRouter.get('/evaluations', async (req, res) => {
  try {
    const { getEvaluatorEvaluations } = await import('../controllers/evaluation.controller.js');
    return getEvaluatorEvaluations(req, res);
  } catch (error) {
    console.error('Error in evaluator evaluations endpoint:', error);
    res.status(500).json({ message: 'Evaluations endpoint not available', error: error.message });
  }
});

evaluatorRouter.get('/teams', async (req, res) => {
  try {
    const { getEvaluatorTeams } = await import('../controllers/evaluation.controller.js');
    return getEvaluatorTeams(req, res);
  } catch (error) {
    console.error('Error in evaluator teams endpoint:', error);
    res.status(500).json({ message: 'Teams endpoint not available', error: error.message });
  }
});

// Mount evaluator routes on /evaluator path (BEFORE admin middleware)
router.use('/evaluator', evaluatorRouter);

// Apply protection and admin check to admin-only routes
router.use(protect);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Team Management Routes
router.route('/teams')
  .get(getTeams)
  .post(createTeam);

router.post('/teams/:id/resend-invitation', resendTeamInvitation);
router.route('/teams/:id')
  .put(updateTeam)
  .delete(deleteTeam);

// Faculty Management Routes
router.route('/faculty')
  .get(getFaculty)
  .post(createFaculty);

router.post('/faculty/:id/resend-invitation', resendFacultyInvitation);
router.route('/faculty/:id')
  .put(updateFaculty)
  .delete(deleteFaculty);

// Evaluator Management Routes
router.route('/evaluators')
  .get(getEvaluators)
  .post(createEvaluator);

router.post('/evaluators/:id/assign-teams', assignTeamsToEvaluator);
router.post('/evaluators/:id/resend-invitation', resendEvaluatorInvitation);
router.route('/evaluators/:id')
  .put(updateEvaluator)
  .delete(deleteEvaluator);

// Evaluation Management Routes
router.get('/evaluations', getEvaluations);
router.get('/evaluations/team/:teamId', getTeamEvaluations);
router.get('/evaluations/results/status', getResultsStatus);
router.post('/evaluations/results/release', releaseResults);
router.post('/evaluations/results/retract', retractResults);

// User Management Routes
router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .delete(deleteUser)
  .put(updateUser);

// Poster Launch Management Routes
router.route('/poster-launch/posters')
  .get(getPosters);

router.route('/poster-launch/launch')
  .post(launchPoster);

router.route('/poster-launch/launched')
  .get(getLaunchedPosters);

router.route('/poster-launch/reset-all')
  .delete(resetAllPosterLaunches);

router.route('/poster-launch/launched/:id')
  .delete(stopPosterLaunch)
  .put(updatePosterLaunch);

// Video Launch Management Routes
router.route('/video-launch/videos')
  .get(getPromotionVideos);

router.route('/video-launch/launch')
  .post(launchPromotionVideo);

router.route('/video-launch/launched')
  .get(getLaunchedVideos);

router.route('/video-launch/reset-all')
  .delete(resetAllVideoLaunches);

router.route('/video-launch/launched/:id')
  .delete(stopVideoLaunch)
  .put(updateVideoLaunch);

// Combined Reset Route
router.route('/reset-all-launches')
  .delete(resetAllLaunches);

export default router;
