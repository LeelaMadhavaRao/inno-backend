import express from 'express';
import { protect } from '../middleware/auth.js';
import { getAllEvaluations, submitEvaluation } from '../controllers/evaluation.controller.js';

const router = express.Router();

router.route('/')
  .get(protect, getAllEvaluations)
  .post(protect, submitEvaluation);

export default router;
