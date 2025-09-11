import asyncHandler from 'express-async-handler';
import Team from '../models/team.model.js';
import User from '../models/user.model.js';

// @desc    Get evaluation results for faculty
// @route   GET /api/faculty/evaluation-results
// @access  Private/Faculty
export const getEvaluationResults = asyncHandler(async (req, res) => {
  try {
    // Get all teams with their evaluation scores
    const teams = await Team.find({})
      .populate('evaluationScores.evaluatorId', 'name email')
      .select('teamName teamLeader teamMembers projectDetails evaluationScores finalRank finalScore createdAt')
      .sort({ finalScore: -1, createdAt: -1 });

    // Check if results are released (you can add this logic based on your requirements)
    // For now, let's assume results are released if at least one team has evaluations
    const resultsReleased = teams.some(team => team.evaluationScores && team.evaluationScores.length > 0);

    // Process teams data
    const processedTeams = teams.map((team, index) => {
      const averageScore = team.calculateAverageScore();
      const evaluationsCount = team.evaluationScores ? team.evaluationScores.length : 0;
      
      return {
        id: team._id,
        name: team.teamName,
        leader: team.teamLeader?.name || 'N/A',
        members: team.teamMembers || [],
        idea: team.projectDetails?.description || team.projectDetails?.title || 'No description available',
        totalScore: Math.round(averageScore),
        evaluationResults: {
          problemStatement: Math.round(averageScore * 0.25), // Distribute score across categories
          teamInvolvement: Math.round(averageScore * 0.25),
          leanCanvas: Math.round(averageScore * 0.25),
          prototype: Math.round(averageScore * 0.25)
        },
        evaluatedBy: evaluationsCount > 0 ? `${evaluationsCount} evaluator(s)` : 'Not evaluated',
        evaluatedAt: team.evaluationScores && team.evaluationScores.length > 0 
          ? team.evaluationScores[team.evaluationScores.length - 1].submittedAt 
          : null,
        rank: team.finalRank || (index + 1),
        evaluationsCount,
        isEvaluated: evaluationsCount > 0
      };
    });

    // Sort by total score (descending) and assign ranks
    processedTeams.sort((a, b) => b.totalScore - a.totalScore);
    processedTeams.forEach((team, index) => {
      team.rank = index + 1;
    });

    res.json({
      success: true,
      data: {
        teams: processedTeams,
        resultsReleased,
        totalTeams: processedTeams.length,
        evaluatedTeams: processedTeams.filter(team => team.isEvaluated).length,
        stats: {
          totalTeams: processedTeams.length,
          evaluatedTeams: processedTeams.filter(team => team.isEvaluated).length,
          averageScore: processedTeams.length > 0 
            ? Math.round(processedTeams.reduce((sum, team) => sum + team.totalScore, 0) / processedTeams.length)
            : 0,
          topScore: processedTeams.length > 0 ? processedTeams[0].totalScore : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching evaluation results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching evaluation results',
      error: error.message
    });
  }
});

// @desc    Get faculty dashboard stats
// @route   GET /api/faculty/stats
// @access  Private/Faculty
export const getFacultyStats = asyncHandler(async (req, res) => {
  try {
    const totalTeams = await Team.countDocuments();
    const evaluatedTeams = await Team.countDocuments({
      'evaluationScores.0': { $exists: true }
    });

    const teams = await Team.find({})
      .select('evaluationScores');

    let totalScore = 0;
    let evaluatedCount = 0;

    teams.forEach(team => {
      if (team.evaluationScores && team.evaluationScores.length > 0) {
        totalScore += team.calculateAverageScore();
        evaluatedCount++;
      }
    });

    const averageScore = evaluatedCount > 0 ? Math.round(totalScore / evaluatedCount) : 0;

    res.json({
      success: true,
      data: {
        totalTeams,
        evaluatedTeams,
        pendingEvaluations: totalTeams - evaluatedTeams,
        averageScore
      }
    });
  } catch (error) {
    console.error('Error fetching faculty stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty stats',
      error: error.message
    });
  }
});
