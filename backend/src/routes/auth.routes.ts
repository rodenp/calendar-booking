import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { validate, validationMessages } from '../middleware/validation';
import { protect } from '../middleware/auth';

const router = express.Router();

// Register user
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage(validationMessages.email)
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage(validationMessages.minLength('Password', 8))
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('firstName')
      .notEmpty()
      .withMessage(validationMessages.required('First name'))
      .trim(),
    body('lastName')
      .notEmpty()
      .withMessage(validationMessages.required('Last name'))
      .trim(),
  ],
  validate([
    body('email').isEmail().withMessage(validationMessages.email),
    body('password').isLength({ min: 8 }).withMessage(validationMessages.minLength('Password', 8)),
    body('firstName').notEmpty().withMessage(validationMessages.required('First name')),
    body('lastName').notEmpty().withMessage(validationMessages.required('Last name')),
  ]),
  authController.register
);

// Login user
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage(validationMessages.email),
    body('password').notEmpty().withMessage(validationMessages.required('Password')),
  ]),
  authController.login
);

// Verify email
router.post(
  '/verify-email',
  validate([
    body('token').notEmpty().withMessage(validationMessages.required('Token')),
  ]),
  authController.verifyEmail
);

// Resend verification email
router.post(
  '/resend-verification',
  validate([
    body('email').isEmail().withMessage(validationMessages.email),
  ]),
  authController.resendVerificationEmail
);

// Forgot password
router.post(
  '/forgot-password',
  validate([
    body('email').isEmail().withMessage(validationMessages.email),
  ]),
  authController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  validate([
    body('token').notEmpty().withMessage(validationMessages.required('Token')),
    body('password')
      .isLength({ min: 8 })
      .withMessage(validationMessages.minLength('Password', 8))
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  ]),
  authController.resetPassword
);

// Refresh token
router.post(
  '/refresh-token',
  validate([
    body('refreshToken').notEmpty().withMessage(validationMessages.required('Refresh token')),
  ]),
  authController.refreshToken
);

// Get current user
router.get('/me', protect, authController.getCurrentUser);

// Change password
router.post(
  '/change-password',
  protect,
  validate([
    body('currentPassword').notEmpty().withMessage(validationMessages.required('Current password')),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage(validationMessages.minLength('New password', 8))
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  ]),
  authController.changePassword
);

// Logout
router.post('/logout', protect, authController.logout);

export default router;