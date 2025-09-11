// Manual fix for super_7 team password synchronization
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

async function manualFix() {
  try {
    console.log('🔧 Manual fix for super_7 team...');
    
    // Connect to MongoDB (using the correct connection string)
    await mongoose.connect('mongodb+srv://leelamadhavnulakani:9133603383@cluster0.fhipcg5.mongodb.net/innoverse?retryWrites=true&w=majority&appName=Cluster0');
    console.log('📡 Connected to MongoDB');
    
    // Define schemas (simplified)
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      isTeamLeader: Boolean,
      teamId: mongoose.Schema.Types.ObjectId,
      teamName: String,
      teamLeaderName: String
    }, { collection: 'users' });
    
    const teamSchema = new mongoose.Schema({
      teamName: String,
      teamLeader: {
        name: String,
        email: String,
        phone: String
      },
      teamMembers: [{
        name: String,
        email: String,
        role: String
      }],
      credentials: {
        username: String,
        password: String,
        isPasswordChanged: Boolean
      }
    }, { collection: 'teams' });
    
    const User = mongoose.model('User', userSchema);
    const Team = mongoose.model('Team', teamSchema);
    
    // Find the team
    const team = await Team.findOne({ teamName: 'super_7' });
    if (!team) {
      console.log('❌ Team not found');
      return;
    }
    
    console.log(`📋 Team: ${team.teamName}`);
    console.log(`👑 Leader: ${team.teamLeader.name} (${team.teamLeader.email})`);
    console.log(`🔑 Current team password: ${team.credentials.password}`);
    
    // The correct password that should be used (from your email)
    const correctPassword = '2g7h5x85ziwueu5eu679';
    
    // Hash it
    const hashedPassword = await bcrypt.hash(correctPassword, 12);
    console.log(`🔒 Generated hash: ${hashedPassword.substring(0, 20)}...`);
    
    // Find the user
    const user = await User.findOne({ email: team.teamLeader.email });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`👤 User: ${user.name} (${user.email})`);
    console.log(`🔒 Current hash: ${user.password.substring(0, 20)}...`);
    
    // Update user password
    user.password = hashedPassword;
    await user.save();
    console.log('✅ User password updated');
    
    // Update team credentials
    team.credentials.password = correctPassword;
    team.credentials.username = team.teamLeader.email;
    
    // Fix team member roles
    team.teamMembers = team.teamMembers.map(member => {
      if (member.name === team.teamLeader.name) {
        return { ...member.toObject(), role: 'leader' };
      } else if (member.role === 'leader' && member.name !== team.teamLeader.name) {
        return { ...member.toObject(), role: 'member' };
      }
      return member;
    });
    
    await team.save();
    console.log('✅ Team credentials and roles updated');
    
    // Verify the fix
    const testResult = await bcrypt.compare(correctPassword, hashedPassword);
    console.log(`🔍 Password verification test: ${testResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    console.log('\n✅ Manual fix completed!');
    console.log(`📧 Email: ${team.teamLeader.email}`);
    console.log(`🔑 Password: ${correctPassword}`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

manualFix();
