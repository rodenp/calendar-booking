import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import EventType from '../models/EventType';
import User from '../models/User';
import Team from '../models/Team';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

// Create a new event type
export const createEventType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      slug,
      description,
      length,
      eventName,
      locations,
      color,
      timeSlots,
      availability,
      customAvailability,
      formFields,
      disableGuests,
      hideEventType,
      schedulingType,
      teamMembers,
      ownerType,
      ownerId,
    } = req.body;

    // Determine owner type and ID
    let owner = {
      type: 'user',
      id: req.user._id,
    };

    // If owner type is team, verify team exists and user is a member
    if (ownerType === 'team' && ownerId) {
      const team = await Team.findById(ownerId);
      if (!team) {
        return next(new NotFoundError('Team not found'));
      }

      // Check if user is a member of the team
      const isMember = team.members.some(
        member => member.user.toString() === req.user._id.toString()
      );

      if (!isMember && team.owner.toString() !== req.user._id.toString()) {
        return next(new ForbiddenError('You are not a member of this team'));
      }

      owner = {
        type: 'team',
        id: new mongoose.Types.ObjectId(ownerId),
      };
    }

    // Generate a unique slug if not provided
    const eventSlug = slug || `${title.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 8)}`;

    // Check if slug is already in use for this owner
    const existingEventType = await EventType.findOne({
      slug: eventSlug,
      'owner.type': owner.type,
      'owner.id': owner.id,
    });

    if (existingEventType) {
      return next(new BadRequestError('Slug is already in use'));
    }

    // Create event type
    const eventType = await EventType.create({
      title,
      slug: eventSlug,
      description,
      length,
      owner,
      eventName: eventName || title,
      locations: locations || [{ type: 'inPerson', data: {} }],
      color: color || '#3182ce',
      timeSlots: {
        incrementInMinutes: timeSlots?.incrementInMinutes || 15,
        minimumBookingNotice: timeSlots?.minimumBookingNotice || 0,
        bufferTimeBefore: timeSlots?.bufferTimeBefore || 0,
        bufferTimeAfter: timeSlots?.bufferTimeAfter || 0,
        dateRangeStart: timeSlots?.dateRangeStart,
        dateRangeEnd: timeSlots?.dateRangeEnd,
        maxBookingsPerDay: timeSlots?.maxBookingsPerDay,
      },
      availability: availability || [
        {
          days: [1, 2, 3, 4, 5], // Monday to Friday
          startTime: '09:00',
          endTime: '17:00',
        },
      ],
      customAvailability,
      formFields: formFields || [
        {
          id: 'name',
          type: 'text',
          label: 'Name',
          placeholder: 'Your name',
          required: true,
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email',
          placeholder: 'your.email@example.com',
          required: true,
        },
      ],
      disableGuests: disableGuests || false,
      hideEventType: hideEventType || false,
      schedulingType: schedulingType || 'individual',
      teamMembers: teamMembers || [],
    });

    res.status(201).json({
      success: true,
      message: 'Event type created successfully',
      data: {
        eventType,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all event types for the current user
export const getMyEventTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user's event types
    const userEventTypes = await EventType.find({
      'owner.type': 'user',
      'owner.id': req.user._id,
    });

    // Get user's teams
    const teams = await Team.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id },
      ],
    });

    // Get team event types
    const teamIds = teams.map(team => team._id);
    const teamEventTypes = await EventType.find({
      'owner.type': 'team',
      'owner.id': { $in: teamIds },
    });

    // Combine event types
    const eventTypes = [...userEventTypes, ...teamEventTypes];

    res.status(200).json({
      success: true,
      data: {
        eventTypes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get event type by ID
export const getEventTypeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Find event type
    const eventType = await EventType.findById(id);
    if (!eventType) {
      return next(new NotFoundError('Event type not found'));
    }

    // Check if user has access to this event type
    if (eventType.owner.type === 'user' && eventType.owner.id.toString() !== req.user._id.toString()) {
      return next(new ForbiddenError('Not authorized to access this event type'));
    }

    if (eventType.owner.type === 'team') {
      // Check if user is a member of the team
      const team = await Team.findById(eventType.owner.id);
      if (!team) {
        return next(new NotFoundError('Team not found'));
      }

      const isMember = team.members.some(
        member => member.user.toString() === req.user._id.toString()
      );

      if (!isMember && team.owner.toString() !== req.user._id.toString()) {
        return next(new ForbiddenError('Not authorized to access this event type'));
      }
    }

    res.status(200).json({
      success: true,
      data: {
        eventType,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get event type by slug
export const getEventTypeBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, slug } = req.params;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Find event type
    const eventType = await EventType.findOne({
      slug,
      'owner.type': 'user',
      'owner.id': user._id,
    });

    if (!eventType) {
      return next(new NotFoundError('Event type not found'));
    }

    // Check if event type is hidden
    if (eventType.hideEventType && eventType.owner.id.toString() !== req.user?._id?.toString()) {
      return next(new NotFoundError('Event type not found'));
    }

    res.status(200).json({
      success: true,
      data: {
        eventType,
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

// Get team event type by slug
export const getTeamEventTypeBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamSlug, slug } = req.params;

    // Find team by slug
    const team = await Team.findOne({ slug: teamSlug });
    if (!team) {
      return next(new NotFoundError('Team not found'));
    }

    // Find event type
    const eventType = await EventType.findOne({
      slug,
      'owner.type': 'team',
      'owner.id': team._id,
    });

    if (!eventType) {
      return next(new NotFoundError('Event type not found'));
    }

    // Check if event type is hidden
    if (eventType.hideEventType) {
      // Check if user is a member of the team
      const isMember = team.members.some(
        member => member.user.toString() === req.user?._id?.toString()
      );

      if (!isMember && team.owner.toString() !== req.user?._id?.toString()) {
        return next(new NotFoundError('Event type not found'));
      }
    }

    res.status(200).json({
      success: true,
      data: {
        eventType,
        team: {
          id: team._id,
          name: team.name,
          slug: team.slug,
          logo: team.settings.logo,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update event type
export const updateEventType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      description,
      length,
      eventName,
      locations,
      color,
      timeSlots,
      availability,
      customAvailability,
      formFields,
      disableGuests,
      hideEventType,
      schedulingType,
      teamMembers,
    } = req.body;

    // Find event type
    const eventType = await EventType.findById(id);
    if (!eventType) {
      return next(new NotFoundError('Event type not found'));
    }

    // Check if user has access to this event type
    if (eventType.owner.type === 'user' && eventType.owner.id.toString() !== req.user._id.toString()) {
      return next(new ForbiddenError('Not authorized to update this event type'));
    }

    if (eventType.owner.type === 'team') {
      // Check if user is a member of the team
      const team = await Team.findById(eventType.owner.id);
      if (!team) {
        return next(new NotFoundError('Team not found'));
      }

      const isMember = team.members.some(
        member => member.user.toString() === req.user._id.toString() && member.role === 'admin'
      );

      if (!isMember && team.owner.toString() !== req.user._id.toString()) {
        return next(new ForbiddenError('Not authorized to update this event type'));
      }
    }

    // Check if slug is already in use
    if (slug && slug !== eventType.slug) {
      const existingEventType = await EventType.findOne({
        slug,
        'owner.type': eventType.owner.type,
        'owner.id': eventType.owner.id,
        _id: { $ne: id },
      });

      if (existingEventType) {
        return next(new BadRequestError('Slug is already in use'));
      }
    }

    // Update event type
    const updatedEventType = await EventType.findByIdAndUpdate(
      id,
      {
        title: title || eventType.title,
        slug: slug || eventType.slug,
        description: description !== undefined ? description : eventType.description,
        length: length || eventType.length,
        eventName: eventName || eventType.eventName,
        locations: locations || eventType.locations,
        color: color || eventType.color,
        timeSlots: {
          incrementInMinutes: timeSlots?.incrementInMinutes || eventType.timeSlots.incrementInMinutes,
          minimumBookingNotice: timeSlots?.minimumBookingNotice !== undefined ? timeSlots.minimumBookingNotice : eventType.timeSlots.minimumBookingNotice,
          bufferTimeBefore: timeSlots?.bufferTimeBefore !== undefined ? timeSlots.bufferTimeBefore : eventType.timeSlots.bufferTimeBefore,
          bufferTimeAfter: timeSlots?.bufferTimeAfter !== undefined ? timeSlots.bufferTimeAfter : eventType.timeSlots.bufferTimeAfter,
          dateRangeStart: timeSlots?.dateRangeStart !== undefined ? timeSlots.dateRangeStart : eventType.timeSlots.dateRangeStart,
          dateRangeEnd: timeSlots?.dateRangeEnd !== undefined ? timeSlots.dateRangeEnd : eventType.timeSlots.dateRangeEnd,
          maxBookingsPerDay: timeSlots?.maxBookingsPerDay !== undefined ? timeSlots.maxBookingsPerDay : eventType.timeSlots.maxBookingsPerDay,
        },
        availability: availability || eventType.availability,
        customAvailability: customAvailability !== undefined ? customAvailability : eventType.customAvailability,
        formFields: formFields || eventType.formFields,
        disableGuests: disableGuests !== undefined ? disableGuests : eventType.disableGuests,
        hideEventType: hideEventType !== undefined ? hideEventType : eventType.hideEventType,
        schedulingType: schedulingType || eventType.schedulingType,
        teamMembers: teamMembers || eventType.teamMembers,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Event type updated successfully',
      data: {
        eventType: updatedEventType,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete event type
export const deleteEventType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Find event type
    const eventType = await EventType.findById(id);
    if (!eventType) {
      return next(new NotFoundError('Event type not found'));
    }

    // Check if user has access to this event type
    if (eventType.owner.type === 'user' && eventType.owner.id.toString() !== req.user._id.toString()) {
      return next(new ForbiddenError('Not authorized to delete this event type'));
    }

    if (eventType.owner.type === 'team') {
      // Check if user is a member of the team
      const team = await Team.findById(eventType.owner.id);
      if (!team) {
        return next(new NotFoundError('Team not found'));
      }

      const isMember = team.members.some(
        member => member.user.toString() === req.user._id.toString() && member.role === 'admin'
      );

      if (!isMember && team.owner.toString() !== req.user._id.toString()) {
        return next(new ForbiddenError('Not authorized to delete this event type'));
      }
    }

    // Delete event type
    await EventType.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Event type deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get all public event types for a user
export const getUserEventTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    // Find event types
    const eventTypes = await EventType.find({
      'owner.type': 'user',
      'owner.id': user._id,
      hideEventType: false,
    });

    res.status(200).json({
      success: true,
      data: {
        eventTypes,
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

// Get all public event types for a team
export const getTeamEventTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamSlug } = req.params;

    // Find team by slug
    const team = await Team.findOne({ slug: teamSlug });
    if (!team) {
      return next(new NotFoundError('Team not found'));
    }

    // Find event types
    const eventTypes = await EventType.find({
      'owner.type': 'team',
      'owner.id': team._id,
      hideEventType: false,
    });

    res.status(200).json({
      success: true,
      data: {
        eventTypes,
        team: {
          id: team._id,
          name: team.name,
          slug: team.slug,
          logo: team.settings.logo,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};