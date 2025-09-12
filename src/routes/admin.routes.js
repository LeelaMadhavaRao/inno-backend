import express from 'express';
import { protect, isAdmin } from '../middleware/auth.js';
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
  resendEvaluatorInvitation,
  assignTeamsToEvaluator,
  
  // Evaluation Management
  getEvaluations,
  getTeamEvaluations,
  
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

// Apply protection and admin check to all routes
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

router.post('/evaluators/:id/resend-invitation', resendEvaluatorInvitation);
router.post('/evaluators/:id/assign-teams', assignTeamsToEvaluator);

// Evaluation Management Routes
router.get('/evaluations', getEvaluations);
router.get('/evaluations/team/:teamId', getTeamEvaluations);

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

// Database Utility Routes
router.route('/fix-email-index')
  .post(protect, isAdmin, async (req, res) => {
    try {
      console.log('🔧 Fixing email index issue...');
      
      // Get direct access to users collection
      const mongoose = await import('mongoose');
      const db = mongoose.default.connection.db;
      const usersCollection = db.collection('users');
      
      console.log('📊 Checking current indexes...');
      const currentIndexes = await usersCollection.indexes();
      console.log('Current indexes:', currentIndexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));
      
      let results = {
        droppedIndex: false,
        createdCompoundIndex: false,
        finalIndexes: []
      };
      
      // Drop the simple email index that's causing conflicts
      try {
        console.log('🗑️ Dropping simple email_1 index...');
        await usersCollection.dropIndex('email_1');
        console.log('✅ Successfully dropped email_1 index');
        results.droppedIndex = true;
      } catch (error) {
        if (error.codeName === 'IndexNotFound') {
          console.log('ℹ️ email_1 index not found (already dropped or never existed)');
        } else {
          console.log('⚠️ Error dropping email_1 index:', error.message);
        }
      }
      
      // Ensure the compound email+role index exists
      try {
        console.log('🔄 Creating/ensuring compound email+role unique index...');
        await usersCollection.createIndex(
          { email: 1, role: 1 }, 
          { unique: true, name: 'email_role_unique' }
        );
        console.log('✅ Compound email+role unique index created/verified');
        results.createdCompoundIndex = true;
      } catch (error) {
        if (error.code === 11000) {
          console.log('⚠️ Duplicate data prevents creating compound index.');
          return res.status(400).json({
            success: false,
            message: 'Cannot create compound index due to duplicate email+role combinations in database',
            error: error.message
          });
        } else {
          throw error;
        }
      }
      
      console.log('📋 Final index verification...');
      const finalIndexes = await usersCollection.indexes();
      results.finalIndexes = finalIndexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique }));
      
      res.json({
        success: true,
        message: 'Email index fixed successfully! You can now create evaluators with faculty emails.',
        results
      });
      
    } catch (error) {
      console.error('❌ Error fixing email index:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fix email index',
        error: error.message
      });
    }
  });

export default router;
