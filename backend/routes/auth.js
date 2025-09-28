import express from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  generateTokenPair, 
  verifyRefreshToken,
  generateAccessToken 
} from '../utils/jwtService.js';
import { 
  userRegistrationSchema, 
  userLoginSchema, 
  userProfileUpdateSchema,
  passwordChangeSchema 
} from '../../shared/schemas/user.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const validatedData = userRegistrationSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'An account with this email address already exists. Please try signing in instead.',
        code: 'USER_ALREADY_EXISTS'
      });
    }
    
    // Create new user
    const user = new User({
      fullName: validatedData.fullName,
      email: validatedData.email,
      passwordHash: validatedData.password // Will be hashed by pre-save middleware
    });
    
    await user.save();
    
    // Generate token pair
    const { accessToken, refreshToken } = generateTokenPair(user._id);
    
    // Store refresh token
    await user.addRefreshToken(refreshToken);
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: user.toJSON()
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors.map(e => e.message)
      });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const validatedData = userLoginSchema.parse(req.body);
    
    // Find user by email
    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password. Please check your credentials and try again.',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password. Please check your credentials and try again.',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Generate token pair
    const { accessToken, refreshToken } = generateTokenPair(user._id);
    
    // Store refresh token
    await user.addRefreshToken(refreshToken);
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: user.toJSON()
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors.map(e => e.message)
      });
    }
    
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Reload user with refreshTokens field to avoid version conflicts
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove all refresh tokens for the user
    await user.removeAllRefreshTokens();
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /api/auth/logout-all
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    // Reload user with refreshTokens field to avoid version conflicts
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove all refresh tokens for the user
    await user.removeAllRefreshTokens();
    
    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.hasRefreshToken(refreshToken)) {
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    res.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    user: req.user.toJSON()
  });
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    // Check if this is a password change request
    if (req.body.currentPassword && req.body.newPassword) {
      // Validate password change data
      const passwordData = passwordChangeSchema.parse(req.body);
      
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(passwordData.currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      
      // Update password
      user.passwordHash = passwordData.newPassword; // Will be hashed by pre-save middleware
      await user.save();
      
      return res.json({
        message: 'Password changed successfully',
        user: user.toJSON()
      });
    } else {
      // Regular profile update (name only)
      const validatedData = userProfileUpdateSchema.parse(req.body);
      
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Update fields if provided
      if (validatedData.fullName) {
        user.fullName = validatedData.fullName;
      }
      
      await user.save();
      
      res.json({
        message: 'Profile updated successfully',
        user: user.toJSON()
      });
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors.map(e => e.message)
      });
    }
    
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

export default router;