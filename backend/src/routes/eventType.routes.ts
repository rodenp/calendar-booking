import express from 'express';
import { body, param } from 'express-validator';
import * as eventTypeController from '../controllers/eventType.controller';
import { validate, validationMessages } from '../middleware/validation';
import { protect } from '../middleware/auth';

const router = express.Router();

// Create a new event type
router.post(
  '/',
  protect,
  validate([
    body('title').notEmpty().withMessage(validationMessages.required('Title')),
    body('slug')
      .optional()
      .matches(/^[a-z0-9-]+$/)
      .withMessage(validationMessages.invalidSlug),
    body('description').optional(),
    body('length')
      .notEmpty()
      .withMessage(validationMessages.required('Length'))
      .isInt({ min: 1 })
      .withMessage(validationMessages.mustBePositive('Length')),
    body('eventName').optional(),
    body('locations').optional().isArray().withMessage(validationMessages.mustBeArray('Locations')),
    body('locations.*.type')
      .optional()
      .isIn(['inPerson', 'phone', 'googleMeet', 'zoom', 'teams', 'custom'])
      .withMessage(validationMessages.mustBeEnum('Location type', ['inPerson', 'phone', 'googleMeet', 'zoom', 'teams', 'custom'])),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage(validationMessages.invalidColor),
    body('timeSlots').optional().isObject().withMessage(validationMessages.mustBeObject('Time slots')),
    body('timeSlots.incrementInMinutes')
      .optional()
      .isIn([5, 10, 15, 20, 30, 45, 60, 90, 120])
      .withMessage('Increment must be one of: 5, 10, 15, 20, 30, 45, 60, 90, 120'),
    body('timeSlots.minimumBookingNotice')
      .optional()
      .isInt({ min: 0 })
      .withMessage(validationMessages.mustBePositive('Minimum booking notice')),
    body('timeSlots.bufferTimeBefore')
      .optional()
      .isInt({ min: 0 })
      .withMessage(validationMessages.mustBePositive('Buffer time before')),
    body('timeSlots.bufferTimeAfter')
      .optional()
      .isInt({ min: 0 })
      .withMessage(validationMessages.mustBePositive('Buffer time after')),
    body('timeSlots.dateRangeStart').optional().isISO8601().withMessage(validationMessages.invalidDateFormat),
    body('timeSlots.dateRangeEnd').optional().isISO8601().withMessage(validationMessages.invalidDateFormat),
    body('timeSlots.maxBookingsPerDay')
      .optional()
      .isInt({ min: 1 })
      .withMessage(validationMessages.mustBePositive('Max bookings per day')),
    body('availability').optional().isArray().withMessage(validationMessages.mustBeArray('Availability')),
    body('availability.*.days')
      .optional()
      .isArray()
      .withMessage(validationMessages.mustBeArray('Days')),
    body('availability.*.startTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage(validationMessages.invalidTimeFormat),
    body('availability.*.endTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage(validationMessages.invalidTimeFormat),
    body('customAvailability').optional().isArray().withMessage(validationMessages.mustBeArray('Custom availability')),
    body('formFields').optional().isArray().withMessage(validationMessages.mustBeArray('Form fields')),
    body('disableGuests').optional().isBoolean().withMessage(validationMessages.mustBeBoolean('Disable guests')),
    body('hideEventType').optional().isBoolean().withMessage(validationMessages.mustBeBoolean('Hide event type')),
    body('schedulingType')
      .optional()
      .isIn(['individual', 'roundRobin', 'collective'])
      .withMessage(validationMessages.mustBeEnum('Scheduling type', ['individual', 'roundRobin', 'collective'])),
    body('teamMembers').optional().isArray().withMessage(validationMessages.mustBeArray('Team members')),
    body('ownerType')
      .optional()
      .isIn(['user', 'team'])
      .withMessage(validationMessages.mustBeEnum('Owner type', ['user', 'team'])),
    body('ownerId').optional().isMongoId().withMessage('Invalid owner ID'),
  ]),
  eventTypeController.createEventType
);

// Get all event types for the current user
router.get('/', protect, eventTypeController.getMyEventTypes);

// Get event type by ID
router.get(
  '/:id',
  protect,
  validate([
    param('id').isMongoId().withMessage('Invalid event type ID'),
  ]),
  eventTypeController.getEventTypeById
);

// Get event type by slug
router.get(
  '/u/:username/:slug',
  validate([
    param('username').notEmpty().withMessage(validationMessages.required('Username')),
    param('slug').notEmpty().withMessage(validationMessages.required('Slug')),
  ]),
  eventTypeController.getEventTypeBySlug
);

// Get team event type by slug
router.get(
  '/team/:teamSlug/:slug',
  validate([
    param('teamSlug').notEmpty().withMessage(validationMessages.required('Team slug')),
    param('slug').notEmpty().withMessage(validationMessages.required('Slug')),
  ]),
  eventTypeController.getTeamEventTypeBySlug
);

// Update event type
router.put(
  '/:id',
  protect,
  validate([
    param('id').isMongoId().withMessage('Invalid event type ID'),
    body('title').optional(),
    body('slug')
      .optional()
      .matches(/^[a-z0-9-]+$/)
      .withMessage(validationMessages.invalidSlug),
    body('description').optional(),
    body('length')
      .optional()
      .isInt({ min: 1 })
      .withMessage(validationMessages.mustBePositive('Length')),
    body('eventName').optional(),
    body('locations').optional().isArray().withMessage(validationMessages.mustBeArray('Locations')),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage(validationMessages.invalidColor),
    body('timeSlots').optional().isObject().withMessage(validationMessages.mustBeObject('Time slots')),
    body('availability').optional().isArray().withMessage(validationMessages.mustBeArray('Availability')),
    body('customAvailability').optional().isArray().withMessage(validationMessages.mustBeArray('Custom availability')),
    body('formFields').optional().isArray().withMessage(validationMessages.mustBeArray('Form fields')),
    body('disableGuests').optional().isBoolean().withMessage(validationMessages.mustBeBoolean('Disable guests')),
    body('hideEventType').optional().isBoolean().withMessage(validationMessages.mustBeBoolean('Hide event type')),
    body('schedulingType')
      .optional()
      .isIn(['individual', 'roundRobin', 'collective'])
      .withMessage(validationMessages.mustBeEnum('Scheduling type', ['individual', 'roundRobin', 'collective'])),
    body('teamMembers').optional().isArray().withMessage(validationMessages.mustBeArray('Team members')),
  ]),
  eventTypeController.updateEventType
);

// Delete event type
router.delete(
  '/:id',
  protect,
  validate([
    param('id').isMongoId().withMessage('Invalid event type ID'),
  ]),
  eventTypeController.deleteEventType
);

// Get all public event types for a user
router.get(
  '/users/:username',
  validate([
    param('username').notEmpty().withMessage(validationMessages.required('Username')),
  ]),
  eventTypeController.getUserEventTypes
);

// Get all public event types for a team
router.get(
  '/teams/:teamSlug',
  validate([
    param('teamSlug').notEmpty().withMessage(validationMessages.required('Team slug')),
  ]),
  eventTypeController.getTeamEventTypes
);

export default router;