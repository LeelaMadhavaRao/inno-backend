import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

async function migrateEmailRoleConstraint() {
  console.log('🔄 Starting migration: email + role constraint...');
  
  try {
    // Connect to database
    await connectDB();
    
    // Get direct access to collections
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const facultyCollection = db.collection('faculties');
    const evaluatorsCollection = db.collection('evaluators');
    const teamsCollection = db.collection('teams');
    
    console.log('📊 Checking current indexes...');
    
    // Check and drop existing unique email indexes
    try {
      console.log('🗂️ Dropping old unique email indexes...');
      
      // Users collection
      try {
        await usersCollection.dropIndex('email_1');
        console.log('✅ Dropped email_1 index from users');
      } catch (error) {
        console.log('ℹ️ email_1 index not found in users (expected)');
      }
      
      // Faculty collection
      try {
        await facultyCollection.dropIndex('email_1');
        console.log('✅ Dropped email_1 index from faculties');
      } catch (error) {
        console.log('ℹ️ email_1 index not found in faculties (expected)');
      }
      
      // Evaluators collection
      try {
        await evaluatorsCollection.dropIndex('email_1');
        console.log('✅ Dropped email_1 index from evaluators');
      } catch (error) {
        console.log('ℹ️ email_1 index not found in evaluators (expected)');
      }
      
      // Teams collection - check teamLeader.email
      try {
        await teamsCollection.dropIndex('teamLeader.email_1');
        console.log('✅ Dropped teamLeader.email_1 index from teams');
      } catch (error) {
        console.log('ℹ️ teamLeader.email_1 index not found in teams (expected)');
      }
      
    } catch (error) {
      console.log('ℹ️ Some indexes may not exist (this is normal)');
    }
    
    console.log('🔍 Checking for email conflicts...');
    
    // Find duplicate emails in users collection
    const emailConflicts = await usersCollection.aggregate([
      {
        $group: {
          _id: '$email',
          count: { $sum: 1 },
          users: { $push: { id: '$_id', name: '$name', role: '$role' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();
    
    if (emailConflicts.length > 0) {
      console.log('⚠️ Found email conflicts:');
      emailConflicts.forEach(conflict => {
        console.log(`   Email: ${conflict._id}`);
        conflict.users.forEach(user => {
          console.log(`      - ${user.name} (${user.role}) [ID: ${user.id}]`);
        });
      });
      
      console.log('💡 Manual resolution required for conflicting emails.');
      console.log('   You may need to update some user emails manually.');
    } else {
      console.log('✅ No email conflicts found');
    }
    
    console.log('🆕 Creating new compound unique indexes...');
    
    // Create compound unique index for users (email + role)
    await usersCollection.createIndex(
      { email: 1, role: 1 }, 
      { unique: true, name: 'email_role_unique' }
    );
    console.log('✅ Created email_role_unique index for users');
    
    // Create regular indexes for other collections (no longer unique)
    await facultyCollection.createIndex({ email: 1 });
    console.log('✅ Created email index for faculties');
    
    await evaluatorsCollection.createIndex({ email: 1 });
    console.log('✅ Created email index for evaluators');
    
    await teamsCollection.createIndex({ 'teamLeader.email': 1 });
    console.log('✅ Created teamLeader.email index for teams');
    
    console.log('📋 Final index verification...');
    
    // Verify indexes
    const userIndexes = await usersCollection.indexes();
    console.log('👥 User collection indexes:', userIndexes.map(idx => idx.name));
    
    const facultyIndexes = await facultyCollection.indexes();
    console.log('🎓 Faculty collection indexes:', facultyIndexes.map(idx => idx.name));
    
    const evaluatorIndexes = await evaluatorsCollection.indexes();
    console.log('⭐ Evaluator collection indexes:', evaluatorIndexes.map(idx => idx.name));
    
    const teamIndexes = await teamsCollection.indexes();
    console.log('👥 Team collection indexes:', teamIndexes.map(idx => idx.name));
    
    console.log('✅ Migration completed successfully!');
    console.log('🎯 Users can now have the same email for different roles');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('📡 Database connection closed');
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateEmailRoleConstraint()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateEmailRoleConstraint;
