import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Faculty from '../models/faculty.model.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  console.log('\n🔐 === PASSWORD VERIFICATION DEBUG ===');
  console.log('📧 Login attempt for email:', email);
  console.log('👥 Login attempt for role:', role);
  console.log('🔑 User input password:', password);
  console.log('🔑 Password length:', password ? password.length : 0);

  // Validate role field - ensure it's a string
  if (role && typeof role !== 'string') {
    console.log('❌ Invalid role type received:', typeof role, role);
    res.status(400);
    throw new Error('Invalid role format. Role must be a string.');
  }

  // Validate role value
  const validRoles = ['admin', 'evaluator', 'team', 'faculty'];
  if (role && !validRoles.includes(role)) {
    console.log('❌ Invalid role value received:', role);
    res.status(400);
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  // Find user by email and role combination
  let user;
  if (role) {
    user = await User.findOne({ email, role }).populate('facultyProfile');
    console.log(`🎯 Looking for user with email: ${email} and role: ${role}`);
  } else {
    // Fallback: try to find any user with this email (for backward compatibility)
    user = await User.findOne({ email }).populate('facultyProfile');
    console.log(`🔍 Looking for any user with email: ${email}`);
  }

  if (user) {
    console.log('👤 User found in database:', user.name);
    console.log('🔒 Stored password hash:', user.password);
    console.log('🔒 Hash length:', user.password ? user.password.length : 0);
    console.log('👥 User role:', user.role);
    console.log('🎓 Faculty profile exists:', !!user.facultyProfile);
    if (user.facultyProfile) {
      console.log('📋 Faculty profile data:', {
        designation: user.facultyProfile.designation,
        department: user.facultyProfile.department,
        specialization: user.facultyProfile.specialization
      });
    } else {
      console.log('❌ No faculty profile found for user');
    }
    console.log('✅ Team leader status:', user.isTeamLeader || false);
    
    // Check if user has team credentials
    if (user.role === 'team') {
      const Team = (await import('../models/team.model.js')).default;
      const team = await Team.findOne({ 'teamLeader.email': email });
      if (team && team.credentials) {
        console.log('👥 Team found:', team.teamName);
        console.log('🔑 Team stored password:', team.credentials.password);
        console.log('📧 Team stored username:', team.credentials.username);
        console.log('🔍 Password comparison:');
        console.log('   Input password:', password);
        console.log('   Team password:', team.credentials.password);
        console.log('   Passwords match:', password === team.credentials.password);
      } else {
        console.log('❌ No team found or no team credentials');
      }
    }
    
    console.log('🔍 Starting bcrypt password verification...');
    const passwordMatch = await user.matchPassword(password);
    console.log('✅ Bcrypt verification result:', passwordMatch);
    
    if (passwordMatch) {
      console.log('🎉 Login successful for:', user.name);
      const token = generateToken(user._id);
      
      // Prepare user data
      let userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      
      // If user is faculty and has faculty profile, include faculty data
      if (user.role === 'faculty' && user.facultyProfile) {
        const facultyProfile = user.facultyProfile;
        userData = {
          ...userData,
          department: facultyProfile.department,
          designation: facultyProfile.designation,
          specialization: facultyProfile.specialization,
          experience: facultyProfile.experience,
          qualifications: facultyProfile.qualifications,
          researchAreas: facultyProfile.researchAreas,
          facultyRole: facultyProfile.role,
          facultyProfile: facultyProfile
        };
        console.log('✅ Faculty profile data included:', {
          designation: facultyProfile.designation,
          department: facultyProfile.department,
          specialization: facultyProfile.specialization
        });
      } else if (user.role === 'faculty') {
        console.log('❌ Faculty user found but no faculty profile linked');
        // Try to find faculty profile by email as fallback
        const Faculty = (await import('../models/faculty.model.js')).default;
        const facultyProfile = await Faculty.findOne({ email: user.email });
        if (facultyProfile) {
          console.log('✅ Found faculty profile by email, linking...');
          // Link the profile to user
          user.facultyProfile = facultyProfile._id;
          await user.save();
          
          userData = {
            ...userData,
            department: facultyProfile.department,
            designation: facultyProfile.designation,
            specialization: facultyProfile.specialization,
            experience: facultyProfile.experience,
            qualifications: facultyProfile.qualifications,
            researchAreas: facultyProfile.researchAreas,
            facultyRole: facultyProfile.role,
            facultyProfile: facultyProfile
          };
          console.log('✅ Faculty profile data recovered and included');
        } else {
          console.log('❌ No faculty profile found for email:', user.email);
        }
      }
      
      res.json({
        token,
        user: userData
      });
    } else {
      console.log('❌ Password verification failed for:', user.name);
      console.log('❌ Input password:', password);
      console.log('❌ Stored hash:', user.password);
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } else {
    console.log('❌ No user found with email:', email, 'and role:', role || 'any');
    
    // If role was specified and no user found, provide helpful error message
    if (role) {
      res.status(401);
      throw new Error(`No ${role} account found with this email. Please check your role selection.`);
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  }
  
  console.log('🔐 === END PASSWORD VERIFICATION DEBUG ===\n');
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  console.log('🆕 === USER REGISTRATION DEBUG ===');
  console.log('📧 Registration attempt for email:', email);
  console.log('👤 Name:', name);
  console.log('👥 Role:', role);

  // Validate required fields
  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error('Please provide all required fields: name, email, password, role');
  }

  // Validate role
  const validRoles = ['admin', 'evaluator', 'team', 'faculty'];
  if (!validRoles.includes(role)) {
    res.status(400);
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  // Check if user with this email and role combination already exists
  const userExists = await User.findOne({ email, role });

  if (userExists) {
    console.log('❌ User already exists:', userExists.name, userExists.role);
    res.status(400);
    throw new Error(`User with this email already exists for ${role} role`);
  }

  try {
    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    if (user) {
      console.log('✅ User created successfully:', user.name, user.role);
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    console.error('❌ User creation failed:', error.message);
    res.status(400);
    throw new Error('Failed to create user: ' + error.message);
  }
  
  console.log('🆕 === END USER REGISTRATION DEBUG ===\n');
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('facultyProfile').select('-password');

  if (user) {
    let userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
    };

    // If user is faculty and has faculty profile, include faculty data
    if (user.role === 'faculty' && user.facultyProfile) {
      const facultyProfile = user.facultyProfile;
      userData = {
        ...userData,
        department: facultyProfile.department,
        designation: facultyProfile.designation,
        specialization: facultyProfile.specialization,
        experience: facultyProfile.experience,
        qualifications: facultyProfile.qualifications,
        researchAreas: facultyProfile.researchAreas,
        facultyRole: facultyProfile.role,
        facultyProfile: facultyProfile
      };
    }

    res.json(userData);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Verify user email
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const user = await User.findOne({
    emailVerificationToken: token,
  });

  if (user) {
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({
      message: 'Email verified successfully',
    });
  } else {
    res.status(400);
    throw new Error('Invalid or expired verification token');
  }
});

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  const user = await User.findOne({ email, role });

  if (user) {
    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Here you would typically send an email with the reset token
    // For now, we'll just return the token (remove this in production)
    res.json({
      message: 'Password reset token generated',
      resetToken, // Remove this line in production
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded.id,
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (user) {
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      res.json({
        message: 'Password reset successfully',
      });
    } else {
      res.status(400);
      throw new Error('Invalid or expired reset token');
    }
  } catch (error) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  // Update last login
  if (req.user) {
    await User.findByIdAndUpdate(req.user.id, {
      lastLoginAt: new Date(),
    });
  }

  res.json({ 
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
});

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1h', // Extended to 24 hours for better user experience
  });
};
