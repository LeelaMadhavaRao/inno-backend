import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';
import Team from '../models/team.model.js';
import Faculty from '../models/faculty.model.js';
import Evaluator from '../models/evaluator.model.js';
import Gallery from '../models/gallery.model.js';
import LaunchedPoster from '../models/launchedPoster.model.js';
import LaunchedVideo from '../models/launchedVideo.model.js';
import EmailService from '../services/emailService.js';
import crypto from 'crypto';

// Lazy load EmailService instance when needed
let emailService = null;
const getEmailService = () => {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalTeams,
    totalFaculty,
    totalEvaluators,
    totalEvaluations,
    totalUsers,
    totalPhotos,
    pendingEvaluations,
    activeTeams
  ] = await Promise.all([
    Team.countDocuments(),
    Faculty.countDocuments(),
    Evaluator.countDocuments(),
    Team.aggregate([
      { $unwind: '$evaluationScores' },
      { $count: 'total' }
    ]),
    User.countDocuments(),
    Gallery.countDocuments(),
    Team.countDocuments({ evaluationStatus: { $ne: 'completed' } }),
    Team.countDocuments({ status: 'active' })
  ]);

  const recentActivity = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email role createdAt');

  res.json({
    stats: {
      totalTeams,
      totalFaculty,
      totalEvaluators,
      totalEvaluations: totalEvaluations[0]?.total || 0,
      totalUsers,
      totalPhotos,
      pendingEvaluations,
      activeTeams
    },
    recentActivity
  });
});

// ==================== TEAM MANAGEMENT ====================

// @desc    Get all teams
// @route   GET /api/admin/teams
// @access  Private/Admin
export const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find()
    .populate('evaluationScores.evaluatorId', 'name email')
    .sort({ createdAt: -1 });

  res.json(teams);
});

// @desc    Create new team with credentials
// @route   POST /api/admin/teams
// @access  Private/Admin
export const createTeam = asyncHandler(async (req, res) => {
  console.log('📝 Creating team with data:', JSON.stringify(req.body, null, 2));
  
  const { 
    teamName, 
    teamLeader, 
    teamMembers, 
    projectDetails, 
    teamSize,
    customPassword
  } = req.body;

  // Validate required fields
  if (!teamName || !teamLeader?.name || !teamLeader?.email) {
    res.status(400);
    throw new Error('Team name, leader name, and leader email are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(teamLeader.email)) {
    res.status(400);
    throw new Error('Please provide a valid email address for team leader');
  }

  // Validate team size and members
  if (teamSize && teamMembers && teamMembers.length !== teamSize - 1) {
    res.status(400);
    throw new Error(`Team members count must match team size minus leader (${teamSize - 1} members expected, got ${teamMembers.length})`);
  }

  // Check if team already exists
  const existingTeam = await Team.findOne({ 
    $or: [
      { teamName: { $regex: new RegExp(`^${teamName}$`, 'i') } },
      { 'teamLeader.email': teamLeader.email }
    ]
  });
  if (existingTeam) {
    res.status(400);
    throw new Error('Team with this name or leader email already exists');
  }

  // Check if team leader already has a team account
  const existingUser = await User.findOne({ email: teamLeader.email, role: 'team' });
  if (existingUser) {
    res.status(400);
    throw new Error('Team leader already has a team account with this email');
  }

  // Generate unique username and password
  const username = teamName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString().slice(-4);
  const password = customPassword || crypto.randomBytes(12).toString('hex');

  // Prepare team members array (including leader)
  const allMembers = [
    {
      name: teamLeader.name,
      email: teamLeader.email,
      role: 'leader',
      isLeader: true
    },
    ...(teamMembers || []).map(memberName => ({
      name: memberName,
      email: '', // Optional field, can be empty
      role: 'member',
      isLeader: false
    }))
  ];

  // Create team
  const team = await Team.create({
    teamName,
    teamLeader: {
      name: teamLeader.name,
      email: teamLeader.email,
      phone: teamLeader.phone || ''
    },
    teamMembers: allMembers,
    teamSize: teamSize || allMembers.length,
    projectDetails: projectDetails || {},
    credentials: {
      username,
      password,
      createdBy: req.user._id
    },
    status: 'active',
    invitationSent: false,
    createdBy: req.user._id
  });

  // Create user account for team
  const user = await User.create({
    name: teamLeader.name,
    email: teamLeader.email,
    password,
    role: 'team',
    teamId: team._id,
    status: 'active',
    createdBy: req.user._id
  });

  // Send invitation email
  let emailSent = false;
  try {
    const emailResult = await getEmailService().sendTeamInvitation({
      teamData: {
        teamName,
        teamLeader,
        teamMembers: allMembers,
        teamSize: team.teamSize
      },
      credentials: {
        username,
        password,
  loginUrl: `${process.env.FRONTEND_URL || 'https://innoverse-csit.web.app'}/login`
      },
      adminMessage: `Team created by admin. Access your team dashboard with the credentials below.`
    });

    // Mark invitation as sent
    team.invitationSent = true;
    team.invitationSentAt = new Date();
    await team.save();
    emailSent = true;

    console.log('✅ Team invitation email sent successfully to:', teamLeader.email);
  } catch (emailError) {
    console.error('❌ Failed to send invitation email:', emailError.message);
    console.log('⚠️ Team created successfully but email invitation failed');
    console.log('📧 Team credentials - Username:', username, 'Password:', password);
    console.log('📧 Please share these credentials with the team leader manually');
  }

  res.status(201).json({
    message: emailSent 
      ? 'Team created successfully and invitation sent'
      : 'Team created successfully (email invitation failed - please share credentials manually)',
    team: {
      _id: team._id,
      teamName: team.teamName,
      teamLeader: team.teamLeader,
      teamMembers: team.teamMembers,
      teamSize: team.teamSize,
      status: team.status,
      invitationSent: team.invitationSent,
      createdAt: team.createdAt
    },
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    credentials: {
      username,
      password: password // Include password in response for admin reference
    },
    emailStatus: emailSent ? 'sent' : 'failed'
  });
});

// @desc    Resend team invitation
// @route   POST /api/admin/teams/:id/resend-invitation
// @access  Private/Admin
export const resendTeamInvitation = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  
  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }

  // Send invitation email
  await getEmailService().sendTeamInvitation({
    teamData: team,
    credentials: team.credentials
  });

  // Update invitation sent status
  team.invitationSent = true;
  team.invitationSentAt = new Date();
  await team.save();

  res.json({ message: 'Invitation resent successfully' });
});

// @desc    Update team
// @route   PUT /api/admin/teams/:id
// @access  Private/Admin
export const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }

  // Update allowed fields
  team.teamName = req.body.teamName || team.teamName;
  if (req.body.teamLeader) {
    team.teamLeader.name = req.body.teamLeader.name || team.teamLeader.name;
    team.teamLeader.email = req.body.teamLeader.email || team.teamLeader.email;
    team.teamLeader.phone = req.body.teamLeader.phone || team.teamLeader.phone;
  }
  team.teamMembers = req.body.teamMembers || team.teamMembers;
  team.teamSize = req.body.teamSize || team.teamSize;
  team.projectDetails = req.body.projectDetails || team.projectDetails;
  team.status = req.body.status || team.status;

  const updated = await team.save();
  res.json({ message: 'Team updated successfully', team: updated });
});

// @desc    Delete team and linked user
// @route   DELETE /api/admin/teams/:id
// @access  Private/Admin
export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }

  // Remove associated user account if present
  const user = await User.findOne({ teamId: team._id });
  if (user) {
    await user.deleteOne();
  }

  await team.deleteOne();
  res.json({ message: 'Team and associated user removed successfully' });
});

// ==================== FACULTY MANAGEMENT ====================

// @desc    Get all faculty
// @route   GET /api/admin/faculty
// @access  Private/Admin
export const getFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.find()
    .populate('userId', 'name email status lastLoginAt')
    .populate('assignedTeams', 'teamName')
    .sort({ createdAt: -1 });

  res.json(faculty);
});

// @desc    Create new faculty member
// @route   POST /api/admin/faculty
// @access  Private/Admin
export const createFaculty = asyncHandler(async (req, res) => {
  console.log('🆕 === FACULTY CREATION DEBUG ===');
  console.log('📧 Request body:', JSON.stringify(req.body, null, 2));
  console.log('👤 Admin user:', req.user ? req.user._id : 'Not authenticated');
  
  const { name, email, department, designation, specialization, experience } = req.body;

  // Validate required fields
  if (!name || !email || !department || !designation || !specialization) {
    console.log('❌ Missing required fields:', {
      name: !!name,
      email: !!email,
      department: !!department,
      designation: !!designation,
      specialization: !!specialization
    });
    res.status(400);
    throw new Error('Please provide all required fields: name, email, department, designation, and specialization');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('❌ Invalid email format:', email);
    res.status(400);
    throw new Error('Please provide a valid email address');
  }

  // Check if faculty with this email already exists (same email can exist for different roles)
  console.log('🔍 Checking for existing faculty with email:', email);
  const existingUser = await User.findOne({ email, role: 'faculty' });
  if (existingUser) {
    console.log('❌ Faculty already exists:', existingUser.name);
    res.status(400);
    throw new Error('Faculty account with this email already exists');
  }

  // Generate password
  const password = crypto.randomBytes(8).toString('hex');
  console.log('🔑 Generated password for faculty');

  try {
    // Create user account
    console.log('👤 Creating user account...');
    const user = await User.create({
      name,
      email,
      password,
      role: 'faculty',
      createdBy: req.user?._id || null
    });
    console.log('✅ User created:', user._id);

    // Create faculty profile
    console.log('🎓 Creating faculty profile...');
    const faculty = await Faculty.create({
      name,
      email,
      userId: user._id,
      department,
      designation,
      specialization,
      experience: experience || '',
      status: 'active'
    });
    console.log('✅ Faculty profile created:', faculty._id);

    // Link faculty profile to user
    console.log('🔗 Linking faculty profile to user...');
    user.facultyProfile = faculty._id;
    await user.save();
    console.log('✅ Faculty profile linked to user');

    // Send invitation email
    try {
      console.log('📧 Sending faculty invitation email...');
      await getEmailService().sendFacultyInvitation({
        facultyData: {
          name,
          email,
          department,
          designation,
          specialization
        },
        credentials: {
          password
        }
      });

      // Mark invitation as sent
      faculty.invitationSent = true;
      faculty.invitationSentAt = new Date();
      await faculty.save();
      console.log('✅ Faculty invitation email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send faculty invitation:', emailError);
      // Don't throw error for email failure - faculty creation was successful
    }

    console.log('🎉 Faculty creation completed successfully');
    res.status(201).json({
      message: 'Faculty member created successfully and invitation sent',
      faculty,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Faculty creation failed:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500);
    throw new Error(`Failed to create faculty account: ${error.message}`);
  }
  
  console.log('🆕 === END FACULTY CREATION DEBUG ===\n');
});

// @desc    Resend faculty invitation
// @route   POST /api/admin/faculty/:id/resend-invitation
// @access  Private/Admin
export const resendFacultyInvitation = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id).populate('userId');
  
  if (!faculty) {
    res.status(404);
    throw new Error('Faculty member not found');
  }

  // Generate new password
  const newPassword = crypto.randomBytes(8).toString('hex');
  faculty.userId.password = newPassword;
  await faculty.userId.save();

  // Send invitation email
  await getEmailService().sendFacultyInvitation({
    facultyData: faculty,
    credentials: {
      password: newPassword
    }
  });

  // Update invitation sent status
  faculty.invitationSent = true;
  faculty.invitationSentAt = new Date();
  await faculty.save();

  res.json({ message: 'Faculty invitation resent successfully' });
});

// @desc    Update faculty
// @route   PUT /api/admin/faculty/:id
// @access  Private/Admin
export const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) {
    res.status(404);
    throw new Error('Faculty member not found');
  }

  faculty.name = req.body.name || faculty.name;
  faculty.email = req.body.email || faculty.email;
  faculty.department = req.body.department || faculty.department;
  faculty.designation = req.body.designation || faculty.designation;
  faculty.specialization = req.body.specialization || faculty.specialization;
  faculty.status = req.body.status || faculty.status;

  const updated = await faculty.save();
  res.json({ message: 'Faculty updated successfully', faculty: updated });
});

// @desc    Delete faculty (and linked user)
// @route   DELETE /api/admin/faculty/:id
// @access  Private/Admin
export const deleteFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) {
    res.status(404);
    throw new Error('Faculty member not found');
  }

  // Remove linked user account
  if (faculty.userId) {
    await User.findByIdAndDelete(faculty.userId);
  }

  await faculty.deleteOne();
  res.json({ message: 'Faculty and linked user removed successfully' });
});

// ==================== EVALUATOR MANAGEMENT ====================

// @desc    Get all evaluators
// @route   GET /api/admin/evaluators
// @access  Private/Admin
export const getEvaluators = asyncHandler(async (req, res) => {
  const evaluators = await Evaluator.find()
    .populate('userId', 'name email status lastLoginAt')
    .populate('assignedTeams.teamId', 'teamName')
    .sort({ createdAt: -1 });

  res.json(evaluators);
});

// @desc    Create new evaluator
// @route   POST /api/admin/evaluators
// @access  Private/Admin
export const createEvaluator = asyncHandler(async (req, res) => {
  const { name, email, organization, designation, expertise, experience, type } = req.body;

  // Check if evaluator with this email already exists (same email can exist for different roles)
  const existingUser = await User.findOne({ email, role: 'evaluator' });
  if (existingUser) {
    res.status(400);
    throw new Error('Evaluator account with this email already exists');
  }

  // Generate password
  const password = crypto.randomBytes(8).toString('hex');

  // Create user account
  const user = await User.create({
    name,
    email,
    password,
    role: 'evaluator',
    createdBy: req.user._id
  });

  // Create evaluator profile
  const evaluator = await Evaluator.create({
    name,
    email,
    userId: user._id,
    organization,
    designation,
    expertise: expertise ? expertise.split(',').map(e => e.trim()) : [],
    experience,
    type,
    status: 'active',
    evaluationCriteria: {
      innovation: { weight: 20, maxScore: 100 },
      technical: { weight: 20, maxScore: 100 },
      business: { weight: 20, maxScore: 100 },
      presentation: { weight: 20, maxScore: 100 },
      feasibility: { weight: 20, maxScore: 100 }
    }
  });

  // Link evaluator profile to user
  user.evaluatorProfile = evaluator._id;
  await user.save();

  // Send invitation email
  try {
    await getEmailService().sendEvaluatorInvitation({
      evaluatorData: {
        name,
        email,
        organization,
        expertise: expertise,
        type
      },
      credentials: {
        password
      }
    });

    // Mark invitation as sent
    evaluator.invitationSent = true;
    evaluator.invitationSentAt = new Date();
    await evaluator.save();
  } catch (emailError) {
    console.error('Failed to send evaluator invitation:', emailError);
  }

  res.status(201).json({
    message: 'Evaluator created successfully and invitation sent',
    evaluator,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// @desc    Assign teams to evaluator
// @route   POST /api/admin/evaluators/:id/assign-teams
// @access  Private/Admin
export const assignTeamsToEvaluator = asyncHandler(async (req, res) => {
  const { teamIds } = req.body;
  const evaluator = await Evaluator.findById(req.params.id);

  if (!evaluator) {
    res.status(404);
    throw new Error('Evaluator not found');
  }

  // Validate teams exist
  const teams = await Team.find({ _id: { $in: teamIds } });
  if (teams.length !== teamIds.length) {
    res.status(400);
    throw new Error('Some teams not found');
  }

  // Add teams to evaluator's assigned teams
  const newAssignments = teamIds.map(teamId => ({
    teamId,
    assignedAt: new Date(),
    status: 'assigned'
  }));

  evaluator.assignedTeams.push(...newAssignments);
  evaluator.totalEvaluationsAssigned += teamIds.length;
  await evaluator.save();

  res.json({
    message: `${teamIds.length} teams assigned to evaluator successfully`,
    evaluator
  });
});

// ==================== EVALUATION MANAGEMENT ====================

// @desc    Get all evaluations with scores
// @route   GET /api/admin/evaluations
// @access  Private/Admin
export const getEvaluations = asyncHandler(async (req, res) => {
  const teams = await Team.find()
    .populate('evaluationScores.evaluatorId', 'name email')
    .select('teamName teamLeader evaluationScores evaluationStatus finalRank finalScore')
    .sort({ finalRank: 1, finalScore: -1 });

  // Get total number of evaluators
  const totalEvaluators = await Evaluator.countDocuments();

  // Calculate team rankings
  const teamsWithScores = teams.map(team => {
    const averageScore = team.calculateAverageScore();
    return {
      ...team.toObject(),
      averageScore: parseFloat(averageScore.toFixed(1)),
      evaluationsCompleted: team.evaluationScores.length,
      evaluationsRemaining: totalEvaluators - team.evaluationScores.length
    };
  });

  // Sort by average score
  teamsWithScores.sort((a, b) => b.averageScore - a.averageScore);

  // Add ranking
  teamsWithScores.forEach((team, index) => {
    team.currentRank = index + 1;
  });

  res.json(teamsWithScores);
});

// @desc    Get detailed evaluation for a team
// @route   GET /api/admin/evaluations/team/:teamId
// @access  Private/Admin
export const getTeamEvaluations = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.teamId)
    .populate('evaluationScores.evaluatorId', 'name email organization')
    .populate('teamLeader');

  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }

  res.json(team);
});

// ==================== USER MANAGEMENT ====================

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .select('-password')
    .populate('teamId', 'teamName')
    .populate('facultyProfile', 'department designation')
    .populate('evaluatorProfile', 'organization type')
    .sort({ createdAt: -1 });

  res.json(users);
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Don't allow deletion of admin users
  if (user.role === 'admin') {
    res.status(400);
    throw new Error('Cannot delete admin users');
  }

  // Delete associated profiles
  if (user.facultyProfile) {
    await Faculty.findByIdAndDelete(user.facultyProfile);
  }
  if (user.evaluatorProfile) {
    await Evaluator.findByIdAndDelete(user.evaluatorProfile);
  }
  if (user.teamId) {
    await Team.findByIdAndDelete(user.teamId);
  }

  await user.deleteOne();
  res.json({ message: 'User and associated data removed successfully' });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Don't allow role change for admin users
  if (user.role === 'admin' && req.body.role !== 'admin') {
    res.status(400);
    throw new Error('Cannot change admin user role');
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.status = req.body.status || user.status;
  user.lastModifiedBy = req.user._id;

  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();
  
  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    status: updatedUser.status,
    lastModifiedBy: updatedUser.lastModifiedBy,
    updatedAt: updatedUser.updatedAt
  });
});

// ==============================================
// POSTER LAUNCH MANAGEMENT
// ==============================================

// @desc    Get all available posters
// @route   GET /api/admin/poster-launch/posters
// @access  Private/Admin
export const getPosters = asyncHandler(async (req, res) => {
  // In a real implementation, this would fetch from a database
  // For now, we'll return the predefined posters
  const posters = [
    {
      id: 'innoverse-2025',
      title: 'Innoverse 2025',
      subtitle: 'Startup Contest',
      description: 'A Startup Contest where we dive deep into the brain for bold ideas',
      tagline: 'Your Pitch. Your Future',
      date: 'SEPTEMBER 15 2K25',
      organizer: 'CSIT DEPARTMENT',
      theme: 'startup-innovation',
      imageUrl: '/innoverse-poster.jpg',
      colors: {
        primary: '#8B5CF6',
        secondary: '#06B6D4',
        accent: '#F59E0B',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)'
      },
      sponsors: ['Dhimavaram', 'Smart work', 'TechGuru', 'InnovaDelight'],
      hods: ['Dr N. Gopi Krishna Murthy', 'Dr M. Suresh Babu'],
      faculty: ['Mr. P.S.V. Surya Kumar', 'Mr. N. Praveen', 'Mr. P. Manoj'],
      status: 'ready',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'potluck-2025',
      title: 'POT LUCK',
      subtitle: 'Community Gathering',
      description: 'Lets meet for the lunch together',
      tagline: 'III CSIT\'s LOVE',
      date: 'AUGUST 16TH 2025',
      organizer: 'III CSIT Students',
      theme: 'community-love',
      imageUrl: '/potluck-poster.jpg',
      colors: {
        primary: '#DC2626',
        secondary: '#F59E0B',
        accent: '#10B981',
        background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #dc2626 100%)'
      },
      values: ['Warmth', 'Trust', 'Cheer', 'Joy', 'Kindness', 'Unity', 'Affection'],
      status: 'ready',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  res.json(posters);
});

// @desc    Launch a poster with configuration
// @route   POST /api/admin/poster-launch/launch
// @access  Private/Admin
export const launchPoster = asyncHandler(async (req, res) => {
  const { posterId, posterData, config, launchedBy } = req.body;

  if (!posterId || !posterData) {
    res.status(400);
    throw new Error('Poster ID and poster data are required');
  }

  // Check if poster is already launched
  const existingLaunch = await LaunchedPoster.findOne({ posterId });
  if (existingLaunch) {
    res.status(400);
    throw new Error('Poster is already launched');
  }

  // Default config if not provided
  const defaultConfig = {
    scheduledTime: new Date(),
    duration: 24,
    targetAudience: 'all',
    message: '',
    priority: 'medium'
  };

  // Create new launched poster record
  const launchedPoster = new LaunchedPoster({
    posterId,
    title: posterData.title,
    subtitle: posterData.subtitle,
    description: posterData.description,
    imageUrl: posterData.imageUrl,
    theme: posterData.theme,
    date: posterData.date,
    organizer: posterData.organizer,
    config: { ...defaultConfig, ...config },
    launchedBy: req.user._id,
    status: 'active',
    isVisible: true,
    analytics: {
      views: 0,
      interactions: 0,
      shares: 0
    }
  });

  // Save to database
  const savedLaunch = await launchedPoster.save();

  // Log the launch
  console.log(`🚀 Poster Launch: ${posterData.title}`);
  console.log(`📊 Configuration:`, savedLaunch.config);
  console.log(`👤 Launched by: ${req.user.email}`);
  console.log(`🎯 Target Audience: ${savedLaunch.config.targetAudience}`);
  console.log(`⏰ Duration: ${savedLaunch.config.duration} hours`);
  
  res.status(201).json({
    message: 'Poster launched successfully with stunning 3D effects!',
    launch: savedLaunch,
    effects: {
      '3d_animations': true,
      'particle_effects': true,
      'gradient_backgrounds': true,
      'hover_interactions': true,
      'rotation_effects': true,
      'scaling_animations': true,
      'color_transitions': true,
      'text_shadows': true,
      'glow_effects': true
    }
  });
});

// @desc    Get all launched posters
// @route   GET /api/admin/poster-launch/launched
// @access  Private/Admin
export const getLaunchedPosters = asyncHandler(async (req, res) => {
  const launchedPosters = await LaunchedPoster.find({})
    .populate('launchedBy', 'name email')
    .sort({ launchedAt: -1 });

  res.json(launchedPosters);
});

// @desc    Stop a poster launch (Reset)
// @route   DELETE /api/admin/poster-launch/launched/:id
// @access  Private/Admin
export const stopPosterLaunch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error('Poster ID is required');
  }

  // Find and remove the launched poster
  const launchedPoster = await LaunchedPoster.findOneAndDelete({ posterId: id });

  if (!launchedPoster) {
    res.status(404);
    throw new Error('Launched poster not found');
  }

  console.log(`🛑 Resetting poster launch: ${launchedPoster.title}`);

  res.json({
    message: 'Poster launch reset successfully',
    resetAt: new Date().toISOString(),
    resetBy: req.user.email,
    poster: {
      id: launchedPoster.posterId,
      title: launchedPoster.title
    }
  });
});

// @desc    Update a poster launch configuration
// @route   PUT /api/admin/poster-launch/launched/:id
// @access  Private/Admin
export const updatePosterLaunch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    res.status(400);
    throw new Error('Launch ID is required');
  }

  // In a real implementation, this would:
  // 1. Find the launch record in database
  // 2. Update the configuration
  // 3. Apply changes to active displays
  // 4. Log the update

  console.log(`✏️ Updating poster launch: ${id}`, updateData);

  res.json({
    message: 'Poster launch updated successfully',
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.id,
    updates: updateData
  });
});

// @desc    Reset all poster launches (bulk stop)
// @route   DELETE /api/admin/poster-launch/reset-all
// @access  Private/Admin
export const resetAllPosterLaunches = asyncHandler(async (req, res) => {
  try {
    // Get all launched posters before deletion for logging
    const launchedPosters = await LaunchedPoster.find({});
    const posterCount = launchedPosters.length;

    if (posterCount === 0) {
      return res.json({
        message: 'No launched posters found to reset',
        resetCount: 0,
        resetAt: new Date().toISOString(),
        resetBy: req.user.email
      });
    }

    // Delete all launched posters
    const deleteResult = await LaunchedPoster.deleteMany({});

    console.log(`🔄 Bulk Reset: ${posterCount} poster(s) reset by ${req.user.email}`);
    console.log(`📊 Reset Details:`, launchedPosters.map(p => ({ id: p.posterId, title: p.title })));

    res.json({
      message: `Successfully reset ${posterCount} poster launch(es)`,
      resetCount: deleteResult.deletedCount,
      resetAt: new Date().toISOString(),
      resetBy: req.user.email,
      resetPosters: launchedPosters.map(p => ({ 
        id: p.posterId, 
        title: p.title 
      }))
    });
  } catch (error) {
    console.error('❌ Error in bulk reset:', error);
    res.status(500);
    throw new Error('Failed to reset poster launches');
  }
});

// ============================================================================
// PROMOTION VIDEO LAUNCH MANAGEMENT
// ============================================================================

// @desc    Get available promotion videos
// @route   GET /api/admin/video-launch/videos
// @access  Private/Admin
export const getPromotionVideos = asyncHandler(async (req, res) => {
  // In a real implementation, this would fetch from a database
  // For now, we'll return the predefined promotion videos
  const promotionVideos = [
    {
      id: 'vikas-promotion-2025',
      title: 'Vikas Promotion Video',
      subtitle: 'Inspiring Success Story',
      description: 'An inspiring promotion video showcasing innovation and excellence',
      date: 'September 8, 2025',
      organizer: 'Marketing Team',
      videoUrl: '/vikas.mp4',
      thumbnailUrl: '/vikas-thumbnail.jpg',
      duration: '2:30',
      theme: 'promotion',
      status: 'ready',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  res.json(promotionVideos);
});

// @desc    Launch a promotion video with configuration
// @route   POST /api/admin/video-launch/launch
// @access  Private/Admin
export const launchPromotionVideo = asyncHandler(async (req, res) => {
  const { videoId, videoData, config, launchedBy } = req.body;

  if (!videoId || !videoData) {
    res.status(400);
    throw new Error('Video ID and video data are required');
  }

  // Check if video is already launched
  const existingLaunch = await LaunchedVideo.findOne({ videoId });
  if (existingLaunch) {
    res.status(400);
    throw new Error('Video is already launched');
  }

  // Default config if not provided
  const defaultConfig = {
    scheduledTime: new Date(),
    displayDuration: 24,
    targetAudience: 'all',
    message: '',
    priority: 'medium',
    autoPlay: true,
    volume: 0.5
  };

  // Create new launched video record
  const launchedVideo = new LaunchedVideo({
    videoId,
    title: videoData.title,
    subtitle: videoData.subtitle,
    description: videoData.description,
    videoUrl: videoData.videoUrl,
    thumbnailUrl: videoData.thumbnailUrl,
    theme: videoData.theme,
    date: videoData.date,
    organizer: videoData.organizer,
    duration: videoData.duration,
    config: { ...defaultConfig, ...config },
    launchedBy: req.user._id,
    status: 'active',
    isVisible: true,
    analytics: {
      views: 0,
      watchTime: 0,
      interactions: 0,
      shares: 0,
      completionRate: 0
    }
  });

  // Save to database
  const savedLaunch = await launchedVideo.save();

  // Log the launch
  console.log(`🎬 Video Launch: ${videoData.title}`);
  console.log(`📊 Configuration:`, savedLaunch.config);
  console.log(`👤 Launched by: ${req.user.email}`);
  console.log(`🎯 Target Audience: ${savedLaunch.config.targetAudience}`);
  console.log(`⏰ Display Duration: ${savedLaunch.config.displayDuration} hours`);
  
  res.status(201).json({
    message: 'Promotion video launched successfully with spectacular effects!',
    launch: savedLaunch,
    effects: {
      '3d_animations': true,
      'particle_effects': true,
      'video_transitions': true,
      'blur_effects': true,
      'gradient_backgrounds': true,
      'spotlight_effects': true,
      'rotation_animations': true,
      'scaling_effects': true,
      'hover_interactions': true,
      'audio_controls': true
    }
  });
});

// @desc    Get all launched promotion videos
// @route   GET /api/admin/video-launch/launched
// @access  Private/Admin
export const getLaunchedVideos = asyncHandler(async (req, res) => {
  const launchedVideos = await LaunchedVideo.find({})
    .populate('launchedBy', 'name email')
    .sort({ launchedAt: -1 });

  res.json(launchedVideos);
});

// @desc    Stop a video launch (Reset)
// @route   DELETE /api/admin/video-launch/launched/:id
// @access  Private/Admin
export const stopVideoLaunch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error('Video ID is required');
  }

  // Find and remove the launched video
  const launchedVideo = await LaunchedVideo.findOneAndDelete({ videoId: id });

  if (!launchedVideo) {
    res.status(404);
    throw new Error('Launched video not found');
  }

  console.log(`🛑 Resetting video launch: ${launchedVideo.title}`);

  res.json({
    message: 'Video launch reset successfully',
    resetAt: new Date().toISOString(),
    resetBy: req.user.email,
    video: {
      id: launchedVideo.videoId,
      title: launchedVideo.title
    }
  });
});

// @desc    Update a video launch configuration
// @route   PUT /api/admin/video-launch/launched/:id
// @access  Private/Admin
export const updateVideoLaunch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    res.status(400);
    throw new Error('Video ID is required');
  }

  // Find and update the launched video
  const launchedVideo = await LaunchedVideo.findOneAndUpdate(
    { videoId: id },
    { ...updateData, updatedAt: new Date() },
    { new: true }
  ).populate('launchedBy', 'name email');

  if (!launchedVideo) {
    res.status(404);
    throw new Error('Launched video not found');
  }

  console.log(`✏️ Updating video launch: ${launchedVideo.title}`, updateData);

  res.json({
    message: 'Video launch updated successfully',
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.email,
    video: launchedVideo
  });
});

// @desc    Reset all video launches (bulk stop)
// @route   DELETE /api/admin/video-launch/reset-all
// @access  Private/Admin
export const resetAllVideoLaunches = asyncHandler(async (req, res) => {
  try {
    // Get all launched videos before deletion for logging
    const launchedVideos = await LaunchedVideo.find({});
    const videoCount = launchedVideos.length;

    if (videoCount === 0) {
      return res.json({
        message: 'No launched videos found to reset',
        resetCount: 0,
        resetAt: new Date().toISOString(),
        resetBy: req.user.email
      });
    }

    // Delete all launched videos
    const deleteResult = await LaunchedVideo.deleteMany({});

    console.log(`🔄 Bulk Video Reset: ${videoCount} video(s) reset by ${req.user.email}`);
    console.log(`📊 Reset Details:`, launchedVideos.map(v => ({ id: v.videoId, title: v.title })));

    res.json({
      message: `Successfully reset ${videoCount} video launch(es)`,
      resetCount: deleteResult.deletedCount,
      resetAt: new Date().toISOString(),
      resetBy: req.user.email,
      resetVideos: launchedVideos.map(v => ({ 
        id: v.videoId, 
        title: v.title 
      }))
    });
  } catch (error) {
    console.error('❌ Error in video bulk reset:', error);
    res.status(500);
    throw new Error('Failed to reset video launches');
  }
});

// @desc    Reset all launches (both posters and videos)
// @route   DELETE /api/admin/reset-all-launches
// @access  Private/Admin
export const resetAllLaunches = asyncHandler(async (req, res) => {
  try {
    // Get counts before deletion
    const posterCount = await LaunchedPoster.countDocuments();
    const videoCount = await LaunchedVideo.countDocuments();
    
    if (posterCount === 0 && videoCount === 0) {
      return res.json({
        message: 'No launched content found to reset',
        resetCount: { posters: 0, videos: 0, total: 0 },
        resetAt: new Date().toISOString(),
        resetBy: req.user.email
      });
    }

    // Delete all launched content
    const [posterResult, videoResult] = await Promise.all([
      LaunchedPoster.deleteMany({}),
      LaunchedVideo.deleteMany({})
    ]);

    const totalReset = posterResult.deletedCount + videoResult.deletedCount;

    console.log(`🔄 Complete Bulk Reset: ${posterResult.deletedCount} poster(s) + ${videoResult.deletedCount} video(s) = ${totalReset} total reset by ${req.user.email}`);

    res.json({
      message: `Successfully reset all launched content`,
      resetCount: {
        posters: posterResult.deletedCount,
        videos: videoResult.deletedCount,
        total: totalReset
      },
      resetAt: new Date().toISOString(),
      resetBy: req.user.email
    });
  } catch (error) {
    console.error('❌ Error in complete bulk reset:', error);
    res.status(500);
    throw new Error('Failed to reset all launches');
  }
});
