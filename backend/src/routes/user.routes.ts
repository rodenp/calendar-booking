import express from 'express';
import { body, param } from 'express-validator';
import * as userController from '../controllers/user.controller';
import { validate, validationMessages } from '../middleware/validation';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Get user profile by username
router.get(
  '/:username',
  validate([
    param('username').notEmpty().withMessage(validationMessages.required('Username')),
  ]),
  userController.getUserProfile
);

// Update user profile
router.put(
  '/profile',
  protect,
  validate([
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('timezone').optional().isString().withMessage(validationMessages.mustBeString('Timezone')),
    body('avatar').optional().isURL().withMessage(validationMessages.invalidUrl),
  ]),
  userController.updateUserProfile
);

// Update username
router.put(
  '/username',
  protect,
  validate([
    body('username')
      .notEmpty()
      .withMessage(validationMessages.required('Username'))
      .isLength({ min: 3 })
      .withMessage(validationMessages.minLength('Username', 3))
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(validationMessages.invalidFormat('Username', 'alphanumeric with underscores and hyphens')),
  ]),
  userController.updateUsername
);

// Update working hours
router.put(
  '/working-hours',
  protect,
  validate([
    body('workingHours').isArray().withMessage(validationMessages.mustBeArray('Working hours')),
    body('workingHours.*.day').isInt({ min: 0, max: 6 }).withMessage('Day must be between 0 and 6'),
    body('workingHours.*.enabled').isBoolean().withMessage(validationMessages.mustBeBoolean('Enabled')),
    body('workingHours.*.startTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage(validationMessages.invalidTimeFormat),
    body('workingHours.*.endTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage(validationMessages.invalidTimeFormat),
  ]),
  userController.updateWorkingHours
);

// Delete user account
router.delete(
  '/account',
  protect,
  validate([
    body('password').notEmpty().withMessage(validationMessages.required('Password')),
  ]),
  userController.deleteUserAccount
);

// Admin routes
// Get user by ID (admin only)
router.get(
  '/admin/users/:id',
  protect,
  authorize('admin'),
  validate([
    param('id').isMongoId().withMessage('Invalid user ID'),
  ]),
  userController.getUserById
);

// Get all users (admin only)
router.get(
  '/admin/users',
  protect,
  authorize('admin'),
  userController.getAllUsers
);

// Update user role (admin only)
router.put(
  '/admin/users/:id/role',
  protect,
  authorize('admin'),
  validate([
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('role')
      .notEmpty()
      .withMessage(validationMessages.required('Role'))
      .isIn(['user', 'admin'])
      .withMessage(validationMessages.mustBeEnum('Role', ['user', 'admin'])),
  ]),
  userController.updateUserRole
);

// Update user plan (admin only)
router.put(
  '/admin/users/:id/plan',
  protect,
  authorize('admin'),
  validate([
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('planType')
      .notEmpty()
      .withMessage(validationMessages.required('Plan type'))
      .isIn(['free', 'standard', 'teams', 'enterprise'])
      .withMessage(validationMessages.mustBeEnum('Plan type', ['free', 'standard', 'teams', 'enterprise'])),
    body('startDate').optional().isISO8601().withMessage(validationMessages.invalidDateFormat),
    body('endDate').optional().isISO8601().withMessage(validationMessages.invalidDateFormat),
  ]),
  userController.updateUserPlan
);

export default router;