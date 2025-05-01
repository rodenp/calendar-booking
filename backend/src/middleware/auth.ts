import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { verifyAccessToken } from '../utils/jwt';
import User from '../models/User';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to protect routes that require authentication
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return next(new UnauthorizedError('Not authorized to access this route'));
    }

    try {
      // Verify token
      const decoded = verifyAccessToken(token);

      // Get user from database
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new UnauthorizedError('User not found'));
      }

      // Set user in request
      req.user = user;
      next();
    } catch (error) {
      return next(new UnauthorizedError('Not authorized to access this route'));
    }
  } catch (error) {
    next(error);
  }
};

// Middleware to restrict access to specific roles
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authorized to access this route'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Role ${req.user.role} is not authorized to access this route`));
    }

    next();
  };
};

// Middleware to check if user has verified email
export const requireVerifiedEmail = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('Not authorized to access this route'));
  }

  if (!req.user.verifiedEmail) {
    return next(new ForbiddenError('Email verification required'));
  }

  next();
};

// Middleware to check if user owns a resource or is an admin
export const checkOwnership = (resourceModel: any, resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Not authorized to access this route'));
      }

      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return next(new UnauthorizedError('Resource not found'));
      }

      // Check if user is admin
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource
      const isOwner = resource.user && resource.user.toString() === req.user._id.toString();
      
      // Check if user is part of the team that owns the resource
      const isTeamMember = resource.owner && 
                          resource.owner.type === 'team' && 
                          req.user.teams && 
                          req.user.teams.includes(resource.owner.id.toString());

      if (!isOwner && !isTeamMember) {
        return next(new ForbiddenError('Not authorized to access this resource'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};