import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from '../utils/errors';

// Middleware to validate request
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      // Format errors for better readability
      const formattedErrors = errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }));
      
      return next(new ValidationError('Validation failed', formattedErrors));
    }
    
    next();
  };
};

// Common validation messages
export const validationMessages = {
  required: (field: string) => `${field} is required`,
  email: 'Please enter a valid email address',
  minLength: (field: string, length: number) => `${field} must be at least ${length} characters long`,
  maxLength: (field: string, length: number) => `${field} must not exceed ${length} characters`,
  passwordMatch: 'Passwords do not match',
  invalidFormat: (field: string, format: string) => `${field} must be in ${format} format`,
  invalidValue: (field: string) => `Invalid value for ${field}`,
  mustBeNumber: (field: string) => `${field} must be a number`,
  mustBePositive: (field: string) => `${field} must be a positive number`,
  mustBeInteger: (field: string) => `${field} must be an integer`,
  mustBeDate: (field: string) => `${field} must be a valid date`,
  mustBeBoolean: (field: string) => `${field} must be a boolean value`,
  mustBeArray: (field: string) => `${field} must be an array`,
  mustBeObject: (field: string) => `${field} must be an object`,
  mustBeString: (field: string) => `${field} must be a string`,
  mustBeEnum: (field: string, values: string[]) => `${field} must be one of: ${values.join(', ')}`,
  mustBeUnique: (field: string) => `${field} already exists`,
  mustExist: (field: string) => `${field} does not exist`,
  invalidTimeRange: 'End time must be after start time',
  invalidDateRange: 'End date must be after start date',
  invalidTimeFormat: 'Time must be in HH:MM format',
  invalidDateFormat: 'Date must be in YYYY-MM-DD format',
  invalidTimezone: 'Invalid timezone',
  invalidColor: 'Color must be a valid hex color code (e.g., #FF5733)',
  invalidUrl: 'Please enter a valid URL',
  invalidSlug: 'Slug can only contain lowercase letters, numbers, and hyphens'
};