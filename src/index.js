import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env') });

// Debug: Check if environment variables are loaded
console.log('🔍 Environment variables check:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);
console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('  EMAIL_USER:', process.env.EMAIL_USER);
console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET');

// Import routes
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import evaluationRoutes from './routes/evaluation.routes.js';
import galleryRoutes from './routes/gallery.routes.js';
import teamRoutes from './routes/team.routes.js';
import posterLaunchRoutes from './routes/posterLaunch.routes.js';

// Import models for public endpoints
import Team from './models/team.model.js';

// Initialize express
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://innoverse-csit.web.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://innoverse-csit.firebaseapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add request logging
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.url} - From: ${req.ip} - User-Agent: ${req.get('User-Agent')?.slice(0, 50)}...`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/poster-launch', posterLaunchRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check request received from:', req.ip);
  
  // Set explicit CORS headers for health check
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  res.json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    url: req.originalUrl,
    method: req.method
  });
});

// Public routes (no auth required)
app.get('/api/teams', async (req, res) => {
  try {
    console.log('📊 Teams endpoint request received from:', req.ip);
    console.log('📊 Fetching teams from database...');
    
    // Set explicit CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Add timeout to database query
    const teams = await Team.find({})
      .select('teamName teamLeader teamMembers projectDetails institution evaluationScores finalRank createdAt')
      .sort({ createdAt: -1 })
      .maxTimeMS(10000); // 10 second timeout
    
    console.log(`✅ Found ${teams.length} teams`);
    res.json({
      success: true,
      data: teams,
      count: teams.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching teams:', error);
    
    // If it's a timeout error, return a simpler response
    if (error.name === 'MongooseTimeoutError' || error.code === 'ETIMEDOUT') {
      console.log('⏰ Database timeout, returning empty teams array');
      res.json({
        success: true,
        data: [],
        count: 0,
        message: 'Database timeout, please try again',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching teams',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Error handler
app.use(errorHandler);

// Catch-all route for API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`,
    availableEndpoints: [
      '/api/health',
      '/api/teams',
      '/api/auth/*',
      '/api/admin/*',
      '/api/evaluations/*',
      '/api/gallery/*',
      '/api/team/*',
      '/api/poster-launch/*'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
