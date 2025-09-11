// Emergency Password Reset Route
// Add this to your team.routes.js or create a separate admin route

import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Team from '../models/team.model.js';

const router = express.Router();

// Emergency password reset for team leaders
router.post('/emergency-password-reset', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        message: 'Email and new password are required' 
      });
    }
    
    console.log(`🔐 Emergency password reset for: ${email}`);
    
    // Generate new hash
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log(`🔐 Generated hash: ${hashedPassword.substring(0, 20)}...`);
    
    // Update user record
    const user = await User.findOneAndUpdate(
      { email: email, role: 'team' },
      { password: hashedPassword },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ 
        message: 'Team user not found with this email' 
      });
    }
    
    // Update team credentials if it's a team leader
    if (user.isTeamLeader) {
      const team = await Team.findOneAndUpdate(
        { 'teamLeader.email': email },
        { 
          'credentials.password': newPassword,
          'credentials.username': email
        },
        { new: true }
      );
      
      if (team) {
        console.log(`✅ Updated team credentials for: ${team.teamName}`);
      }
    }
    
    // Verify the update
    const verifyUser = await User.findOne({ email: email });
    const passwordMatches = await bcrypt.compare(newPassword, verifyUser.password);
    
    res.json({
      success: true,
      message: 'Password reset successful',
      verification: {
        userFound: !!verifyUser,
        passwordMatches: passwordMatches,
        isTeamLeader: verifyUser?.isTeamLeader || false
      }
    });
    
  } catch (error) {
    console.error('Emergency password reset failed:', error);
    res.status(500).json({ 
      message: 'Password reset failed', 
      error: error.message 
    });
  }
});

export default router;
