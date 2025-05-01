import express from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import eventTypeRoutes from './eventType.routes';
import bookingRoutes from './booking.routes';

const router = express.Router();

// Register all routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/event-types', eventTypeRoutes);
router.use('/bookings', bookingRoutes);

export default router;