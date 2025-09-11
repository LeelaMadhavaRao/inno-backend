import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Team Schema (simplified for API)
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
  projectDetails: {
    title: String,
    description: String,
    category: String,
    techStack: [String]
  },
  evaluationScores: [{
    evaluatorId: mongoose.Schema.Types.ObjectId,
    totalScore: Number,
    evaluatedAt: Date
  }],
  createdAt: { type: Date, default: Date.now }
});

let Team;
let isConnected = false;

// Database connection function
const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('📡 MongoDB connected (API route)');
    
    // Create model if it doesn't exist
    if (!Team) {
      Team = mongoose.models.Team || mongoose.model('Team', teamSchema);
    }
  } catch (error) {
    console.error('❌ MongoDB connection error (API route):', error);
    throw error;
  }
};

// API Handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Connect to database
    await connectDB();

    // Fetch teams from database
    const teams = await Team.find({})
      .select('teamName teamLeader teamMembers projectDetails evaluationScores createdAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ API: Found ${teams.length} teams`);

    res.status(200).json({
      success: true,
      data: teams,
      count: teams.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}