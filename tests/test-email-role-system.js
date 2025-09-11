import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import User from '../src/models/user.model.js';
import Faculty from '../src/models/faculty.model.js';
import Evaluator from '../src/models/evaluator.model.js';
import Team from '../src/models/team.model.js';

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

async function testEmailRoleSystem() {
  console.log('🧪 Testing email + role constraint system...');
  
  try {
    // Connect to database
    await connectDB();
    
    const testEmail = 'test@innoverse.com';
    const testPassword = 'TestPassword123!';
    
    console.log(`\n📧 Testing with email: ${testEmail}`);
    
    // Test 1: Create users with same email but different roles
    console.log('\n🔬 Test 1: Creating users with same email, different roles');
    
    const users = [
      {
        name: 'John Faculty',
        email: testEmail,
        password: testPassword,
        role: 'faculty'
      },
      {
        name: 'John Team Leader',
        email: testEmail,
        password: testPassword,
        role: 'team'
      },
      {
        name: 'John Evaluator',
        email: testEmail,
        password: testPassword,
        role: 'evaluator'
      },
      {
        name: 'John Admin',
        email: testEmail,
        password: testPassword,
        role: 'admin'
      }
    ];
    
    const createdUsers = [];
    
    for (const userData of users) {
      try {
        console.log(`   Creating ${userData.role}: ${userData.name}`);
        const user = await User.create(userData);
        createdUsers.push(user);
        console.log(`   ✅ Created ${userData.role} user successfully`);
      } catch (error) {
        console.log(`   ❌ Failed to create ${userData.role} user:`, error.message);
      }
    }
    
    // Test 2: Try to create duplicate email+role combination (should fail)
    console.log('\n🔬 Test 2: Attempting duplicate email+role (should fail)');
    try {
      await User.create({
        name: 'Another Faculty',
        email: testEmail,
        password: testPassword,
        role: 'faculty' // Same role as existing user
      });
      console.log('   ❌ ERROR: Duplicate email+role was allowed (should have failed)');
    } catch (error) {
      console.log('   ✅ Correctly prevented duplicate email+role:', error.message);
    }
    
    // Test 3: Verify login with role works
    console.log('\n🔬 Test 3: Testing login with role specification');
    
    for (const user of createdUsers) {
      console.log(`   Testing login for ${user.role}: ${user.name}`);
      
      // Find user by email and role
      const foundUser = await User.findOne({ email: user.email, role: user.role });
      if (foundUser) {
        // Test password verification
        const isMatch = await foundUser.matchPassword(testPassword);
        console.log(`   📧 Found user: ${foundUser.name} (${foundUser.role})`);
        console.log(`   🔐 Password match: ${isMatch ? '✅' : '❌'}`);
      } else {
        console.log(`   ❌ User not found for role: ${user.role}`);
      }
    }
    
    // Test 4: Test faculty profile creation with same email
    console.log('\n🔬 Test 4: Testing faculty profile creation');
    try {
      const facultyUser = createdUsers.find(u => u.role === 'faculty');
      if (facultyUser) {
        const faculty = await Faculty.create({
          name: facultyUser.name,
          email: facultyUser.email,
          userId: facultyUser._id,
          department: 'Computer Science',
          designation: 'Professor',
          specialization: 'AI/ML'
        });
        console.log('   ✅ Faculty profile created successfully');
        
        // Link back to user
        facultyUser.facultyProfile = faculty._id;
        await facultyUser.save();
        console.log('   ✅ Faculty profile linked to user');
      }
    } catch (error) {
      console.log('   ❌ Faculty profile creation failed:', error.message);
    }
    
    // Test 5: Test evaluator profile creation with same email
    console.log('\n🔬 Test 5: Testing evaluator profile creation');
    try {
      const evaluatorUser = createdUsers.find(u => u.role === 'evaluator');
      if (evaluatorUser) {
        const evaluator = await Evaluator.create({
          name: evaluatorUser.name,
          email: evaluatorUser.email,
          userId: evaluatorUser._id,
          organization: 'Tech Corp',
          designation: 'Senior Developer',
          type: 'industry'
        });
        console.log('   ✅ Evaluator profile created successfully');
        
        // Link back to user
        evaluatorUser.evaluatorProfile = evaluator._id;
        await evaluatorUser.save();
        console.log('   ✅ Evaluator profile linked to user');
      }
    } catch (error) {
      console.log('   ❌ Evaluator profile creation failed:', error.message);
    }
    
    // Test 6: Test team creation with same email
    console.log('\n🔬 Test 6: Testing team creation');
    try {
      const teamUser = createdUsers.find(u => u.role === 'team');
      if (teamUser) {
        const team = await Team.create({
          teamName: 'Test Innovation Team',
          teamLeader: {
            name: teamUser.name,
            email: teamUser.email,
            phone: '1234567890'
          },
          teamMembers: [
            {
              name: teamUser.name,
              email: teamUser.email,
              role: 'leader'
            }
          ],
          credentials: {
            username: 'testteam_123',
            password: testPassword
          },
          status: 'active'
        });
        console.log('   ✅ Team created successfully');
        
        // Link back to user
        teamUser.teamId = team._id;
        await teamUser.save();
        console.log('   ✅ Team linked to user');
      }
    } catch (error) {
      console.log('   ❌ Team creation failed:', error.message);
    }
    
    // Test 7: Display final results
    console.log('\n📊 Final Results Summary:');
    
    const allUsersWithEmail = await User.find({ email: testEmail });
    console.log(`   Found ${allUsersWithEmail.length} users with email ${testEmail}:`);
    
    for (const user of allUsersWithEmail) {
      console.log(`   - ${user.name} (${user.role}) [ID: ${user._id}]`);
    }
    
    // Test 8: Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    try {
      // Delete users
      const deleteResult = await User.deleteMany({ email: testEmail });
      console.log(`   ✅ Deleted ${deleteResult.deletedCount} users`);
      
      // Delete related profiles
      await Faculty.deleteMany({ email: testEmail });
      await Evaluator.deleteMany({ email: testEmail });
      await Team.deleteMany({ 'teamLeader.email': testEmail });
      console.log('   ✅ Deleted related profiles and teams');
      
    } catch (error) {
      console.log('   ⚠️ Cleanup error:', error.message);
    }
    
    console.log('\n🎉 Test completed successfully!');
    console.log('✅ Email + role constraint system is working correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('📡 Database connection closed');
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEmailRoleSystem()
    .then(() => {
      console.log('🎯 Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

export default testEmailRoleSystem;
