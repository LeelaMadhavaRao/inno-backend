import asyncHandler from 'express-async-handler';
import Evaluation from '../models/evaluation.model.js';

// @desc    Get all evaluations
// @route   GET /api/evaluations
// @access  Private
export const getAllEvaluations = asyncHandler(async (req, res) => {
  const evaluations = await Evaluation.find({})
    .populate('teamId')
    .populate('evaluatorId', 'name email');
  
  res.json(evaluations);
});

// @desc    Submit an evaluation
// @route   POST /api/evaluations
// @access  Private/Evaluator
export const submitEvaluation = asyncHandler(async (req, res) => {
  const { teamId, scores, comments } = req.body;

  const evaluation = await Evaluation.create({
    teamId,
    evaluatorId: req.user._id,
    scores,
    comments
  });

  res.status(201).json(evaluation);
});
