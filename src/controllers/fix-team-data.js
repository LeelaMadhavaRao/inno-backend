import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Team from '../models/team.model.js';

/**
 * Fix team data synchronization issues
 * This function will:
 * 1. Hash the team's plain password and update user's password
 * 2. Fix team member roles in the teamMembers array
 * 3. Ensure proper synchronization between Users and Teams collections
 */
async function fixTeamDataSynchronization() {
  try {
    console.log('🔧 Starting team data synchronization fix...');
    
    // Find the specific team
    const team = await Team.findOne({ teamName: 'super_7' });
    if (!team) {
      console.log('❌ Team super_7 not found');
      return { success: false, message: 'Team not found' };
    }
    
    console.log(`📋 Found team: ${team.teamName}`);
    console.log(`👑 Current team leader: ${team.teamLeader.name} (${team.teamLeader.email})`);
    console.log(`🔑 Team password: ${team.credentials.password}`);
    
    // 1. FIX PASSWORD SYNCHRONIZATION
    // Hash the team's plain password and update the user's password
    const teamPassword = team.credentials.password;
    const hashedPassword = await bcrypt.hash(teamPassword, 12);
    
    // Find and update the user record
    const user = await User.findOne({ email: team.teamLeader.email });
    if (user) {
      console.log(`👤 Found user: ${user.name} (${user.email})`);
      console.log(`🔒 Current user hash: ${user.password.substring(0, 20)}...`);
      
      // Update user's password with properly hashed team password
      user.password = hashedPassword;
      await user.save();
      
      console.log(`✅ Updated user password hash: ${hashedPassword.substring(0, 20)}...`);
      
      // Verify the password works
      const isPasswordValid = await bcrypt.compare(teamPassword, hashedPassword);
      console.log(`🔍 Password verification test: ${isPasswordValid ? '✅ PASS' : '❌ FAIL'}`);
    } else {
      console.log(`❌ User not found for email: ${team.teamLeader.email}`);
    }
    
    // 2. FIX TEAM MEMBERS ROLES
    console.log('\n🔧 Fixing team member roles...');
    
    // Find current leader in team members and update role
    const updatedMembers = team.teamMembers.map(member => {
      if (member.name === team.teamLeader.name) {
        console.log(`👑 Setting ${member.name} role from '${member.role}' to 'leader'`);
        return { ...member.toObject(), role: 'leader' };
      } else if (member.role === 'leader' && member.name !== team.teamLeader.name) {
        console.log(`👤 Setting ${member.name} role from '${member.role}' to 'member'`);
        return { ...member.toObject(), role: 'member' };
      }
      return member;
    });
    
    // Update team members array
    team.teamMembers = updatedMembers;
    await team.save();
    
    console.log('\n✅ Team member roles updated:');
    team.teamMembers.forEach(member => {
      console.log(`   ${member.name}: ${member.role}`);
    });
    
    // 3. VERIFICATION
    console.log('\n🔍 Final verification...');
    
    // Re-fetch and verify
    const verifiedTeam = await Team.findOne({ teamName: 'super_7' });
    const verifiedUser = await User.findOne({ email: team.teamLeader.email });
    
    if (verifiedUser) {
      const finalPasswordTest = await bcrypt.compare(teamPassword, verifiedUser.password);
      console.log(`🔑 Final password test: ${finalPasswordTest ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`👑 Team leader: ${verifiedTeam.teamLeader.name}`);
      console.log(`👥 Team members with leader role: ${verifiedTeam.teamMembers.filter(m => m.role === 'leader').length}`);
      console.log(`👥 Team members with member role: ${verifiedTeam.teamMembers.filter(m => m.role === 'member').length}`);
    }
    
    return {
      success: true,
      message: 'Team data synchronization completed successfully',
      details: {
        teamName: team.teamName,
        teamLeader: team.teamLeader.name,
        passwordFixed: true,
        memberRolesFixed: true,
        totalMembers: team.teamMembers.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error fixing team data:', error);
    return {
      success: false,
      message: 'Failed to fix team data',
      error: error.message
    };
  }
}

export { fixTeamDataSynchronization };
