// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  errors?: any;
  
  constructor(statusCode: number, message: string, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    
    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
    
    // This captures the proper stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common HTTP errors
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request', errors?: any) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', errors?: any) {
    super(401, message, errors);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', errors?: any) {
    super(403, message, errors);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', errors?: any) {
    super(404, message, errors);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict', errors?: any) {
    super(409, message, errors);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation Error', errors?: any) {
    super(422, message, errors);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal Server Error', errors?: any) {
    super(500, message, errors);
  }
}

// Error handler middleware
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  // If it's an ApiError, use its status code and message
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  // For Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((val: any) => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  // For JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  // For JWT expiration errors
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  // For MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  // Default to 500 server error
  console.error('Error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};