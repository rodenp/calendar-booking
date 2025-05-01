import express from 'express';
import { body, param, query } from 'express-validator';
import * as bookingController from '../controllers/booking.controller';
import { validate, validationMessages } from '../middleware/validation';
import { protect } from '../middleware/auth';

const router = express.Router();

// Create a new booking
router.post(
  '/',
  validate([
    body('eventTypeId').isMongoId().withMessage('Invalid event type ID'),
    body('startTime').isISO8601().withMessage(validationMessages.invalidDateFormat),
    body('endTime').isISO8601().withMessage(validationMessages.invalidDateFormat),
    body('timeZone').notEmpty().withMessage(validationMessages.required('Time zone')),
    body('name').notEmpty().withMessage(validationMessages.required('Name')),
    body('email').isEmail().withMessage(validationMessages.email),
    body('location').optional().isObject().withMessage(validationMessages.mustBeObject('Location')),
    body('formResponses').optional().isArray().withMessage(validationMessages.mustBeArray('Form responses')),
    body('rescheduleUid').optional().isString().withMessage(validationMessages.mustBeString('Reschedule UID')),
    body('userId').optional().isMongoId().withMessage('Invalid user ID'),
  ]),
  bookingController.createBooking
);

// Get booking by UID
router.get(
  '/:uid',
  validate([
    param('uid').notEmpty().withMessage(validationMessages.required('UID')),
  ]),
  bookingController.getBookingByUid
);

// Cancel booking
router.post(
  '/:uid/cancel',
  validate([
    param('uid').notEmpty().withMessage(validationMessages.required('UID')),
    body('cancellationReason').optional().isString().withMessage(validationMessages.mustBeString('Cancellation reason')),
  ]),
  bookingController.cancelBooking
);

// Get all bookings for the current user
router.get(
  '/',
  protect,
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    query('status').optional().isIn(['confirmed', 'cancelled', 'rescheduled']).withMessage('Invalid status'),
    query('startDate').optional().isISO8601().withMessage(validationMessages.invalidDateFormat),
    query('endDate').optional().isISO8601().withMessage(validationMessages.invalidDateFormat),
  ]),
  bookingController.getMyBookings
);

// Get upcoming bookings for the current user
router.get(
  '/upcoming',
  protect,
  bookingController.getMyUpcomingBookings
);

// Get past bookings for the current user
router.get(
  '/past',
  protect,
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
  ]),
  bookingController.getMyPastBookings
);

// Check availability for a specific time slot
router.post(
  '/check-availability',
  validate([
    body('eventTypeId').isMongoId().withMessage('Invalid event type ID'),
    body('date').isISO8601().withMessage(validationMessages.invalidDateFormat),
    body('startTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage(validationMessages.invalidTimeFormat),
    body('endTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage(validationMessages.invalidTimeFormat),
    body('timeZone').notEmpty().withMessage(validationMessages.required('Time zone')),
    body('userId').optional().isMongoId().withMessage('Invalid user ID'),
  ]),
  bookingController.checkAvailability
);

export default router;