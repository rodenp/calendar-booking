import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { sendEmail, emailTemplates } from '../utils/email';
import env from '../config/env';

// Register a new user
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new BadRequestError('User already exists with this email'));
    }

    // Generate username from email
    const username = email.split('@')[0].toLowerCase() + '-' + Math.floor(Math.random() * 1000);

    // Create default working hours (9 AM to 5 PM, Monday to Friday)
    const defaultWorkingHours = [
      { day: 1, enabled: true, startTime: '09:00', endTime: '17:00' }, // Monday
      { day: 2, enabled: true, startTime: '09:00', endTime: '17:00' }, // Tuesday
      { day: 3, enabled: true, startTime: '09:00', endTime: '17:00' }, // Wednesday
      { day: 4, enabled: true, startTime: '09:00', endTime: '17:00' }, // Thursday
      { day: 5, enabled: true, startTime: '09:00', endTime: '17:00' }, // Friday
      { day: 0, enabled: false, startTime: '09:00', endTime: '17:00' }, // Sunday
      { day: 6, enabled: false, startTime: '09:00', endTime: '17:00' }, // Saturday
    ];

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      username,
      defaultWorkingHours,
      timezone: 'UTC',
    });

    // Generate verification token
    const verificationToken = uuidv4();
    
    // Store verification token in user metadata
    user.metadata = {
      ...user.metadata,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
    
    await user.save();

    // Send verification email
    const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Verify Your Email - Calendly Clone',
      html: emailTemplates.welcome(user.firstName, verificationLink),
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          verifiedEmail: user.verifiedEmail,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new UnauthorizedError('Invalid credentials'));
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new UnauthorizedError('Invalid credentials'));
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          verifiedEmail: user.verifiedEmail,
          role: user.role,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Verify email
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    // Find user with verification token
    const user = await User.findOne({
      'metadata.verificationToken': token,
      'metadata.verificationTokenExpires': { $gt: new Date() },
    });

    if (!user) {
      return next(new BadRequestError('Invalid or expired verification token'));
    }

    // Update user
    user.verifiedEmail = true;
    
    // Remove verification token
    if (user.metadata) {
      delete user.metadata.verificationToken;
      delete user.metadata.verificationTokenExpires;
    }
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Resend verification email
export const resendVerificationEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Check if email is already verified
    if (user.verifiedEmail) {
      return next(new BadRequestError('Email is already verified'));
    }

    // Generate verification token
    const verificationToken = uuidv4();
    
    // Store verification token in user metadata
    user.metadata = {
      ...user.metadata,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
    
    await user.save();

    // Send verification email
    const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Verify Your Email - Calendly Clone',
      html: emailTemplates.welcome(user.firstName, verificationLink),
    });

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Generate reset token
    const resetToken = uuidv4();
    
    // Store reset token in user metadata
    user.metadata = {
      ...user.metadata,
      resetToken,
      resetTokenExpires: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
    };
    
    await user.save();

    // Send reset email
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Reset Your Password - Calendly Clone',
      html: emailTemplates.passwordReset(user.firstName, resetLink),
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    // Find user with reset token
    const user = await User.findOne({
      'metadata.resetToken': token,
      'metadata.resetTokenExpires': { $gt: new Date() },
    });

    if (!user) {
      return next(new BadRequestError('Invalid or expired reset token'));
    }

    // Update password
    user.password = password;
    
    // Remove reset token
    if (user.metadata) {
      delete user.metadata.resetToken;
      delete user.metadata.resetTokenExpires;
    }
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new BadRequestError('Refresh token is required'));
    }

    try {
      // Verify refresh token
      const decoded = require('../utils/jwt').verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new UnauthorizedError('Invalid refresh token'));
      }

      // Generate new access token
      const accessToken = generateAccessToken(user);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
        },
      });
    } catch (error) {
      return next(new UnauthorizedError('Invalid refresh token'));
    }
  } catch (error) {
    next(error);
  }
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          timezone: user.timezone,
          avatar: user.avatar,
          verifiedEmail: user.verifiedEmail,
          role: user.role,
          plan: user.plan,
          defaultWorkingHours: user.defaultWorkingHours,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Change password
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Check if current password matches
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new BadRequestError('Current password is incorrect'));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Logout
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Note: In a real implementation, you might want to invalidate the refresh token
    // by storing it in a blacklist or database until it expires
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};