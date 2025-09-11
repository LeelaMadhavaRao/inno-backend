import express from 'express';
import { protect } from '../middleware/auth.js';
import Team from '../models/team.model.js';
import Gallery from '../models/gallery.model.js';

const router = express.Router();

// Get team profile with full details
router.get('/profile', protect, async (req, res) => {
  try {
    const user = req.user;
    
    // Find team by user ID or email
    let team = await Team.findOne({
      $or: [
        { 'teamLeader.email': user.email },
        { 'teamMembers.email': user.email },
        { 'credentials.username': user.username }
      ]
    }).select('-credentials.password');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Get actual gallery count for this team
    const galleryCount = await Gallery.countDocuments({ 
      uploadedBy: user._id,
      status: { $in: ['pending', 'approved'] }
    });

    // Calculate stats from actual data
    const stats = {
      averageScore: team.evaluationScores && team.evaluationScores.length > 0 
        ? Math.round(team.evaluationScores.reduce((sum, evaluation) => sum + evaluation.totalScore, 0) / team.evaluationScores.length)
        : 0,
      totalEvaluations: team.evaluationScores ? team.evaluationScores.length : 0,
      teamSize: team.teamMembers ? team.teamMembers.length : 0, // Don't add 1 since leader might already be included
      galleryCount: galleryCount,
      rank: team.finalRank || null, // null means not disclosed yet
      ranksDisclosed: team.finalRank ? true : false
    };

    res.json({
      _id: team._id,
      teamName: team.teamName,
      teamLeader: team.teamLeader,
      teamMembers: team.teamMembers || [],
      institution: team.institution,
      projectDetails: team.projectDetails || {},
      evaluationScores: team.evaluationScores || [],
      evaluationStatus: team.evaluationStatus,
      status: team.status,
      createdAt: team.createdAt,
      stats,
      // Compatibility fields for frontend
      name: team.teamName,
      email: team.teamLeader.email,
      members: team.teamMembers?.map(member => member.name) || []
    });
  } catch (error) {
    console.error('Error fetching team profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update team profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = req.user;
    const updateData = req.body;

    // Find team by user ID or email
    let team = await Team.findOne({
      $or: [
        { 'teamLeader.email': user.email },
        { 'teamMembers.email': user.email }
      ]
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Store original values for reference
    const originalTeamName = team.teamName;
    const originalTeamLeader = { ...team.teamLeader };

    // Update team name if provided
    if (updateData.teamName && updateData.teamName !== originalTeamName) {
      team.teamName = updateData.teamName;
    }

    // ===== HANDLE TEAM LEADER CHANGE =====
    if (updateData.teamLeader) {
      let newLeaderName;
      let newLeaderEmail;
      
      // Handle different input formats
      if (typeof updateData.teamLeader === 'string') {
        newLeaderName = updateData.teamLeader;
        // Find the email from team members
        const memberFound = team.teamMembers.find(member => member.name === newLeaderName);
        newLeaderEmail = memberFound ? memberFound.email : null;
      } else if (typeof updateData.teamLeader === 'object') {
        newLeaderName = updateData.teamLeader.name;
        newLeaderEmail = updateData.teamLeader.email;
      }
      
      if (newLeaderName && newLeaderName !== originalTeamLeader.name) {
        let newLeader = null;
        
        // Find the new leader from team members or use provided data
        const existingMember = team.teamMembers.find(member => member.name === newLeaderName);
        
        if (existingMember) {
          newLeader = {
            name: existingMember.name,
            email: newLeaderEmail || existingMember.email,
            phone: existingMember.phone || ''
          };
        } else if (newLeaderEmail) {
          newLeader = {
            name: newLeaderName,
            email: newLeaderEmail,
            phone: ''
          };
        }
        
        // Validate that the new leader has an email
        if (!newLeader || !newLeader.email || newLeader.email.trim() === '') {
          return res.status(400).json({ 
            message: 'Cannot set team leader: Email address is required for team leader' 
          });
        }

        console.log(`🔄 Team leader changing from ${originalTeamLeader.name} (${originalTeamLeader.email}) to ${newLeader.name} (${newLeader.email})`);

        // ===== UPDATE USERS COLLECTION =====
        const User = (await import('../models/user.model.js')).default;
        
        // ⚠️ KEEP THE EXISTING PASSWORD - Don't generate new one
        // Find the existing user with the previous leader's email
        const previousLeaderUser = await User.findOne({ email: originalTeamLeader.email });
        
        if (previousLeaderUser) {
          console.log(`� Found existing user: ${previousLeaderUser.email} with password hash: ${previousLeaderUser.password.substring(0, 20)}...`);
          
          // Store the existing password hash to reuse it
          const existingPasswordHash = previousLeaderUser.password;
          
          // ✅ UPDATE ALL FIELDS IN USERS COLLECTION - but keep same password
          previousLeaderUser.email = newLeader.email;
          previousLeaderUser.name = newLeader.name;
          previousLeaderUser.password = existingPasswordHash; // KEEP SAME PASSWORD HASH
          previousLeaderUser.isTeamLeader = true;
          previousLeaderUser.teamId = team._id;
          previousLeaderUser.teamName = team.teamName;
          previousLeaderUser.teamLeaderName = newLeader.name;
          
          // Save and wait for completion
          await previousLeaderUser.save();
          console.log(`✅ Updated user record: ${originalTeamLeader.email} → ${newLeader.email}, name: ${originalTeamLeader.name} → ${newLeader.name}`);
          console.log(`✅ Kept existing password hash: ${existingPasswordHash.substring(0, 20)}...`);

          // ✅ Update team credentials with CURRENT team password (not new one)
          team.credentials = {
            username: newLeader.email,
            password: team.credentials.password, // KEEP EXISTING TEAM PASSWORD
            isPasswordChanged: team.credentials.isPasswordChanged || false
          };
          
          console.log(`✅ Team credentials updated - Username: ${newLeader.email}, Password: ${team.credentials.password}`);

          // Verify user update by re-querying
          const verifyUser = await User.findOne({ email: newLeader.email });
          if (verifyUser && verifyUser.password === existingPasswordHash) {
            console.log(`✅ User password preservation verified`);
          } else {
            console.log(`❌ User password preservation failed - verification failed`);
          }

          // Send credentials email to new team leader with EXISTING password
          try {
            const EmailService = (await import('../services/emailService.js')).default;
            const emailService = new EmailService();
            
            const emailResult = await emailService.sendTeamInvitation({
              teamData: {
                teamName: team.teamName,
                teamLeader: newLeader,
                teamMembers: team.teamMembers
              },
              credentials: {
                username: newLeader.email,
                password: team.credentials.password // Send existing team password
              }
            });

            if (emailResult.success) {
              console.log(`✅ Credentials email sent to new team leader: ${newLeader.email} with existing password`);
            } else {
              console.log(`❌ Failed to send email to new team leader: ${emailResult.error}`);
            }
          } catch (emailError) {
            console.error('Error sending credentials email:', emailError);
          }
        }

        // ===== UPDATE TEAMS COLLECTION =====
        // ✅ FIX: Update team members roles properly
        
        // First, find if the previous leader exists in teamMembers and remove them
        team.teamMembers = team.teamMembers.filter(member => 
          member.name !== originalTeamLeader.name && member.email !== originalTeamLeader.email
        );
        
        // Find the new leader in teamMembers and remove them (they'll become leader)
        const newLeaderMember = team.teamMembers.find(member => 
          member.name === newLeader.name || member.email === newLeader.email
        );
        
        team.teamMembers = team.teamMembers.filter(member => 
          member.name !== newLeader.name && member.email !== newLeader.email
        );
        
        // ✅ FIX: Add previous leader to teamMembers with 'member' role
        team.teamMembers.push({
          name: originalTeamLeader.name,
          email: originalTeamLeader.email || '',
          role: 'member'
        });

        // ✅ Set new leader in teamLeader field
        team.teamLeader = {
          name: newLeader.name,
          email: newLeader.email,
          phone: newLeader.phone || ''
        };

        console.log(`✅ Updated teams collection:`);
        console.log(`   - Moved ${originalTeamLeader.name} to team members with role: member`);
        console.log(`   - Set ${newLeader.name} as team leader`);
        console.log(`   - Team members count: ${team.teamMembers.length}`);

        // Update all team members' records to reflect new leader name
        for (const member of team.teamMembers) {
          if (member.email && member.email !== newLeader.email) {
            await User.updateOne(
              { email: member.email },
              { 
                $set: {
                  teamId: team._id,
                  teamName: team.teamName,
                  teamLeaderName: newLeader.name,
                  updatedAt: new Date()
                }
              }
            );
          }
        }
        console.log(`✅ Updated all team members with new leader name: ${newLeader.name}`);
      }
    }

    // Update other fields
    if (updateData.teamMembers) {
      team.teamMembers = updateData.teamMembers;
    }
    if (updateData.projectDetails) {
      team.projectDetails = { ...team.projectDetails, ...updateData.projectDetails };
    }
    if (updateData.problemStatement) {
      team.projectDetails.description = updateData.problemStatement;
    }

    // Update team name in users collection if changed
    if (updateData.teamName && updateData.teamName !== originalTeamName) {
      const User = (await import('../models/user.model.js')).default;
      await User.updateMany(
        { teamId: team._id },
        { 
          $set: { 
            teamName: team.teamName,
            updatedAt: new Date()
          }
        }
      );
    }

    // Save the team
    await team.save();

    res.json({ 
      message: 'Profile updated successfully across all collections',
      team: {
        ...team.toObject(),
        name: team.teamName,
        email: team.teamLeader.email
      },
      changes: {
        teamNameChanged: updateData.teamName && updateData.teamName !== originalTeamName,
        teamLeaderChanged: updateData.teamLeader && (
          typeof updateData.teamLeader === 'string' 
            ? updateData.teamLeader !== originalTeamLeader.name
            : updateData.teamLeader.name !== originalTeamLeader.name
        ),
        membersUpdated: updateData.teamMembers ? team.teamMembers.length : 0
      }
    });
  } catch (error) {
    console.error('Error updating team profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get team results and evaluations
router.get('/results', protect, async (req, res) => {
  try {
    const user = req.user;
    
    // Find team by user ID or email
    const team = await Team.findOne({
      $or: [
        { 'teamLeader.email': user.email },
        { 'teamMembers.email': user.email }
      ]
    }).populate('evaluationScores.evaluatorId', 'name');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Format evaluation results
    const results = team.evaluationScores.map(evaluation => ({
      id: evaluation._id,
      evaluationTitle: 'Project Evaluation',
      score: evaluation.totalScore,
      maxScore: 100,
      feedback: evaluation.feedback,
      evaluatedAt: evaluation.submittedAt,
      evaluatorName: evaluation.evaluatorName,
      category: 'General',
      criteria: [
        { name: 'Innovation', score: evaluation.scores?.innovation || 0, maxScore: 100 },
        { name: 'Technical', score: evaluation.scores?.technical || 0, maxScore: 100 },
        { name: 'Business', score: evaluation.scores?.business || 0, maxScore: 100 },
        { name: 'Presentation', score: evaluation.scores?.presentation || 0, maxScore: 100 }
      ]
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching team results:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get team gallery items (combined gallery)
router.get('/gallery', protect, async (req, res) => {
  try {
    const user = req.user;
    
    // Get team's own photos
    const myPhotos = await Gallery.find({ 
      uploadedBy: user._id 
    }).sort({ createdAt: -1 });

    // Get all approved public photos
    const publicPhotos = await Gallery.find({ 
      status: 'approved',
      uploadedBy: { $ne: user._id } // Exclude own photos to avoid duplicates
    }).populate('uploadedBy', 'name email').sort({ createdAt: -1 });

    res.json({
      myPhotos: myPhotos.map(photo => ({
        ...photo.toObject(),
        isOwn: true
      })),
      publicPhotos: publicPhotos.map(photo => ({
        ...photo.toObject(),
        isOwn: false
      })),
      totalCount: myPhotos.length + publicPhotos.length
    });
  } catch (error) {
    console.error('Error fetching team gallery:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
