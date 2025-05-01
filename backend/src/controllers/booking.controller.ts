import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import EventType from '../models/EventType';
import User from '../models/User';
import Team from '../models/Team';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { sendEmail, emailTemplates } from '../utils/email';
import { isTimeSlotAvailable, dateTimeStringToDate } from '../utils/date';
import env from '../config/env';

// Create a new booking
export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      eventTypeId,
      startTime,
      endTime,
      timeZone,
      name,
      email,
      location,
      formResponses,
      rescheduleUid,
    } = req.body;

    // Find event type
    const eventType = await EventType.findById(eventTypeId);
    if (!eventType) {
      return next(new NotFoundError('Event type not found'));
    }

    // Find owner (user or team)
    let user;
    let teamMembers = [];

    if (eventType.owner.type === 'user') {
      user = await User.findById(eventType.owner.id);
      if (!user) {
        return next(new NotFoundError('User not found'));
      }
    } else if (eventType.owner.type === 'team') {
      const team = await Team.findById(eventType.owner.id);
      if (!team) {
        return next(new NotFoundError('Team not found'));
      }

      // Handle different scheduling types
      if (eventType.schedulingType === 'roundRobin') {
        // For round robin, select one team member based on availability or load balancing
        // This is a simplified implementation - in a real app, you'd have more complex logic
        const availableMembers = eventType.teamMembers || [];
        if (availableMembers.length === 0) {
          return next(new BadRequestError('No team members available for this event type'));
        }

        // Simple round-robin: select the member with the fewest recent bookings
        const memberBookingCounts = await Promise.all(
          availableMembers.map(async (memberId) => {
            const count = await Booking.countDocuments({
              user: memberId,
              startTime: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
            });
            return { memberId, count };
          })
        );

        // Sort by booking count (ascending)
        memberBookingCounts.sort((a, b) => a.count - b.count);
        
        // Select the member with the fewest bookings
        const selectedMemberId = memberBookingCounts[0].memberId;
        user = await User.findById(selectedMemberId);
        if (!user) {
          return next(new NotFoundError('Team member not found'));
        }
      } else if (eventType.schedulingType === 'collective') {
        // For collective, include all team members
        teamMembers = eventType.teamMembers || [];
        
        // Get the first team member as the primary host
        if (teamMembers.length > 0) {
          user = await User.findById(teamMembers[0]);
          if (!user) {
            return next(new NotFoundError('Team member not found'));
          }
        } else {
          return next(new BadRequestError('No team members available for this event type'));
        }
      } else {
        // For individual, use the specified user
        if (!req.body.userId) {
          return next(new BadRequestError('User ID is required for individual team event types'));
        }
        
        user = await User.findById(req.body.userId);
        if (!user) {
          return next(new NotFoundError('User not found'));
        }
        
        // Check if user is a member of the team
        const isMember = team.members.some(
          member => member.user.toString() === user!._id.toString()
        );
        
        if (!isMember && team.owner.toString() !== user._id.toString()) {
          return next(new ForbiddenError('User is not a member of this team'));
        }
      }
    }

    if (!user) {
      return next(new NotFoundError('Host not found'));
    }

    // Parse start and end times
    const bookingStartTime = new Date(startTime);
    const bookingEndTime = new Date(endTime);

    // Check if the time slot is available
    const existingBookings = await Booking.find({
      user: user._id,
      status: 'confirmed',
      $or: [
        {
          startTime: { $lt: bookingEndTime },
          endTime: { $gt: bookingStartTime },
        },
      ],
    });

    const isAvailable = isTimeSlotAvailable(
      bookingStartTime,
      bookingEndTime,
      eventType.timeSlots.bufferTimeBefore || 0,
      eventType.timeSlots.bufferTimeAfter || 0,
      existingBookings.map(booking => ({
        start: booking.startTime,
        end: booking.endTime,
      }))
    );

    if (!isAvailable) {
      return next(new BadRequestError('The selected time slot is not available'));
    }

    // Create booking
    const booking = await Booking.create({
      eventType: eventType._id,
      user: user._id,
      teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
      invitee: {
        email,
        name,
        timezone: timeZone,
        formResponses: formResponses || [],
      },
      startTime: bookingStartTime,
      endTime: bookingEndTime,
      status: 'confirmed',
      location: location || eventType.locations[0],
      uid: uuidv4(),
      rescheduleUid: rescheduleUid,
    });

    // If this is a reschedule, update the original booking
    if (rescheduleUid) {
      await Booking.findOneAndUpdate(
        { uid: rescheduleUid },
        { status: 'rescheduled' }
      );
    }

    // Send confirmation emails
    const hostName = `${user.firstName} ${user.lastName}`;
    const eventName = eventType.eventName || eventType.title;
    const locationString = getLocationString(booking.location);

    // Format dates for emails
    const startTimeString = bookingStartTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZone,
    });

    const endTimeString = bookingEndTime.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      timeZone,
    });

    const timeRangeString = `${startTimeString} - ${endTimeString}`;

    // Send email to host
    await sendEmail({
      to: user.email,
      subject: `New booking: ${eventName} with ${name}`,
      html: emailTemplates.bookingConfirmationHost(
        hostName,
        eventName,
        name,
        startTimeString,
        endTimeString,
        timeZone,
        locationString,
        formResponses ? formResponses.reduce((acc: Record<string, string>, curr: any) => {
          acc[curr.label] = curr.value;
          return acc;
        }, {}) : undefined
      ),
    });

    // Send email to invitee
    const cancelLink = `${env.FRONTEND_URL}/cancel?uid=${booking.uid}`;
    const rescheduleLink = `${env.FRONTEND_URL}/reschedule?uid=${booking.uid}`;

    await sendEmail({
      to: email,
      subject: `Confirmed: ${eventName} with ${hostName}`,
      html: emailTemplates.bookingConfirmationInvitee(
        name,
        hostName,
        eventName,
        startTimeString,
        endTimeString,
        timeZone,
        locationString,
        cancelLink,
        rescheduleLink
      ),
    });

    // Send emails to team members for collective events
    if (teamMembers.length > 0) {
      const teamMemberUsers = await User.find({ _id: { $in: teamMembers } });
      
      for (const teamMember of teamMemberUsers) {
        if (teamMember._id.toString() !== user._id.toString()) {
          await sendEmail({
            to: teamMember.email,
            subject: `New booking: ${eventName} with ${name}`,
            html: emailTemplates.bookingConfirmationHost(
              `${teamMember.firstName} ${teamMember.lastName}`,
              eventName,
              name,
              startTimeString,
              endTimeString,
              timeZone,
              locationString,
              formResponses ? formResponses.reduce((acc: Record<string, string>, curr: any) => {
                acc[curr.label] = curr.value;
                return acc;
              }, {}) : undefined
            ),
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get booking by UID
export const getBookingByUid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid } = req.params;

    // Find booking
    const booking = await Booking.findOne({ uid })
      .populate('eventType')
      .populate('user', 'firstName lastName email username avatar');

    if (!booking) {
      return next(new NotFoundError('Booking not found'));
    }

    res.status(200).json({
      success: true,
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Cancel booking
export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid } = req.params;
    const { cancellationReason } = req.body;

    // Find booking
    const booking = await Booking.findOne({ uid })
      .populate('eventType')
      .populate('user', 'firstName lastName email');

    if (!booking) {
      return next(new NotFoundError('Booking not found'));
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return next(new BadRequestError('Booking is already cancelled'));
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.cancellationReason = cancellationReason;
    await booking.save();

    // Send cancellation emails
    const hostName = `${booking.user.firstName} ${booking.user.lastName}`;
    const eventName = booking.eventType.eventName || booking.eventType.title;
    const inviteeName = booking.invitee.name;

    // Format dates for emails
    const startTimeString = booking.startTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZone: booking.invitee.timezone,
    });

    const endTimeString = booking.endTime.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      timeZone: booking.invitee.timezone,
    });

    // Send email to host
    await sendEmail({
      to: booking.user.email,
      subject: `Cancelled: ${eventName} with ${inviteeName}`,
      html: emailTemplates.bookingCancellationHost(
        hostName,
        eventName,
        inviteeName,
        startTimeString,
        endTimeString,
        booking.invitee.timezone,
        cancellationReason
      ),
    });

    // Send email to invitee
    const rebookLink = `${env.FRONTEND_URL}/book/${booking.user.username}/${booking.eventType.slug}`;

    await sendEmail({
      to: booking.invitee.email,
      subject: `Cancelled: ${eventName} with ${hostName}`,
      html: emailTemplates.bookingCancellationInvitee(
        inviteeName,
        hostName,
        eventName,
        startTimeString,
        endTimeString,
        booking.invitee.timezone,
        rebookLink
      ),
    });

    // Send emails to team members for collective events
    if (booking.teamMembers && booking.teamMembers.length > 0) {
      const teamMemberUsers = await User.find({ _id: { $in: booking.teamMembers } });
      
      for (const teamMember of teamMemberUsers) {
        if (teamMember._id.toString() !== booking.user._id.toString()) {
          await sendEmail({
            to: teamMember.email,
            subject: `Cancelled: ${eventName} with ${inviteeName}`,
            html: emailTemplates.bookingCancellationHost(
              `${teamMember.firstName} ${teamMember.lastName}`,
              eventName,
              inviteeName,
              startTimeString,
              endTimeString,
              booking.invitee.timezone,
              cancellationReason
            ),
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all bookings for the current user
export const getMyBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build query
    const query: any = { user: req.user._id };

    if (status) {
      query.status = status;
    }

    if (startDate) {
      query.startTime = { $gte: new Date(startDate) };
    }

    if (endDate) {
      query.endTime = { ...query.endTime, $lte: new Date(endDate) };
    }

    // Find bookings
    const bookings = await Booking.find(query)
      .populate('eventType')
      .skip(skip)
      .limit(limit)
      .sort({ startTime: 1 });

    // Count total bookings
    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        bookings,
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

// Get upcoming bookings for the current user
export const getMyUpcomingBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Find upcoming bookings
    const bookings = await Booking.find({
      user: req.user._id,
      status: 'confirmed',
      startTime: { $gte: new Date() },
    })
      .populate('eventType')
      .sort({ startTime: 1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get past bookings for the current user
export const getMyPastBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Find past bookings
    const bookings = await Booking.find({
      user: req.user._id,
      endTime: { $lt: new Date() },
    })
      .populate('eventType')
      .skip(skip)
      .limit(limit)
      .sort({ startTime: -1 });

    // Count total past bookings
    const total = await Booking.countDocuments({
      user: req.user._id,
      endTime: { $lt: new Date() },
    });

    res.status(200).json({
      success: true,
      data: {
        bookings,
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

// Check availability for a specific time slot
export const checkAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventTypeId, date, startTime, endTime, timeZone } = req.body;

    // Find event type
    const eventType = await EventType.findById(eventTypeId);
    if (!eventType) {
      return next(new NotFoundError('Event type not found'));
    }

    // Find user
    let userId;
    if (eventType.owner.type === 'user') {
      userId = eventType.owner.id;
    } else if (req.body.userId) {
      userId = req.body.userId;
    } else if (eventType.teamMembers && eventType.teamMembers.length > 0) {
      userId = eventType.teamMembers[0];
    } else {
      return next(new BadRequestError('User ID is required for team event types'));
    }

    // Parse start and end times
    const bookingStartTime = dateTimeStringToDate(date, startTime, timeZone);
    const bookingEndTime = dateTimeStringToDate(date, endTime, timeZone);

    // Check if the time slot is available
    const existingBookings = await Booking.find({
      user: userId,
      status: 'confirmed',
      $or: [
        {
          startTime: { $lt: bookingEndTime },
          endTime: { $gt: bookingStartTime },
        },
      ],
    });

    const isAvailable = isTimeSlotAvailable(
      bookingStartTime,
      bookingEndTime,
      eventType.timeSlots.bufferTimeBefore || 0,
      eventType.timeSlots.bufferTimeAfter || 0,
      existingBookings.map(booking => ({
        start: booking.startTime,
        end: booking.endTime,
      }))
    );

    res.status(200).json({
      success: true,
      data: {
        isAvailable,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to get location string
const getLocationString = (location: any): string => {
  switch (location.type) {
    case 'inPerson':
      return location.data?.address || 'In-person meeting';
    case 'phone':
      return 'Phone call';
    case 'googleMeet':
      return 'Google Meet';
    case 'zoom':
      return 'Zoom';
    case 'teams':
      return 'Microsoft Teams';
    case 'custom':
      return location.data?.description || 'Custom location';
    default:
      return 'Meeting';
  }
};