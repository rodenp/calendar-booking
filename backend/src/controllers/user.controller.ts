import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

// Get user profile
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, timezone, avatar } = req.body;

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (timezone) user.timezone = timezone;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          timezone: user.timezone,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update username
export const updateUsername = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.body;

    // Check if username is already taken
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return next(new BadRequestError('Username is already taken'));
    }

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Update username
    user.username = username;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Username updated successfully',
      data: {
        username: user.username,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update working hours
export const updateWorkingHours = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workingHours } = req.body;

    // Validate working hours
    if (!Array.isArray(workingHours) || workingHours.length !== 7) {
      return next(new BadRequestError('Working hours must be an array of 7 days'));
    }

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Update working hours
    user.defaultWorkingHours = workingHours;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Working hours updated successfully',
      data: {
        workingHours: user.defaultWorkingHours,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete user account
export const deleteUserAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;

    // Find user
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new BadRequestError('Password is incorrect'));
    }

    // Delete user
    await User.findByIdAndDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID (admin only)
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new ForbiddenError('Not authorized to access this resource'));
    }

    // Find user
    const user = await User.findById(id);
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
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new ForbiddenError('Not authorized to access this resource'));
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Find users
    const users = await User.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Count total users
    const total = await User.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          role: user.role,
          plan: user.plan.type,
          verifiedEmail: user.verifiedEmail,
          createdAt: user.createdAt,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user role (admin only)
export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new ForbiddenError('Not authorized to access this resource'));
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Update role
    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user plan (admin only)
export const updateUserPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { planType, startDate, endDate } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new ForbiddenError('Not authorized to access this resource'));
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Update plan
    user.plan = {
      type: planType,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
    };
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User plan updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          plan: user.plan,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};