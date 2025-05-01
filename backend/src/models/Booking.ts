import mongoose, { Document, Schema } from 'mongoose';

// Define form response interface
interface FormResponse {
  id: string;
  label: string;
  value: string;
}

// Define invitee interface
interface Invitee {
  email: string;
  name: string;
  timezone: string;
  locale?: string;
  formResponses: FormResponse[];
}

// Define location interface
interface Location {
  type: string;
  data?: Record<string, any>;
}

// Define calendar event IDs interface
interface CalendarEventIds {
  google?: string;
  outlook?: string;
  apple?: string;
}

// Define booking interface extending Document
export interface IBooking extends Document {
  eventType: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  teamMembers?: mongoose.Types.ObjectId[];
  invitee: Invitee;
  startTime: Date;
  endTime: Date;
  status: string;
  cancellationReason?: string;
  location: Location;
  uid: string;
  calendarEventIds?: CalendarEventIds;
  rescheduleUid?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Create booking schema
const bookingSchema = new Schema<IBooking>(
  {
    eventType: {
      type: Schema.Types.ObjectId,
      ref: 'EventType',
      required: [true, 'Event type is required'],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    teamMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    invitee: {
      email: {
        type: String,
        required: [true, 'Invitee email is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      },
      name: {
        type: String,
        required: [true, 'Invitee name is required'],
        trim: true,
      },
      timezone: {
        type: String,
        required: [true, 'Invitee timezone is required'],
      },
      locale: {
        type: String,
      },
      formResponses: [
        {
          id: {
            type: String,
            required: [true, 'Form response ID is required'],
          },
          label: {
            type: String,
            required: [true, 'Form response label is required'],
          },
          value: {
            type: String,
            required: [true, 'Form response value is required'],
          },
        },
      ],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'rescheduled'],
      default: 'confirmed',
    },
    cancellationReason: {
      type: String,
    },
    location: {
      type: {
        type: String,
        required: [true, 'Location type is required'],
        enum: ['inPerson', 'phone', 'googleMeet', 'zoom', 'teams', 'custom'],
      },
      data: {
        type: Schema.Types.Mixed,
      },
    },
    uid: {
      type: String,
      required: [true, 'UID is required'],
      unique: true,
    },
    calendarEventIds: {
      google: {
        type: String,
      },
      outlook: {
        type: String,
      },
      apple: {
        type: String,
      },
    },
    rescheduleUid: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Add indexes
bookingSchema.index({ user: 1 });
bookingSchema.index({ eventType: 1 });
bookingSchema.index({ startTime: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ uid: 1 }, { unique: true });
bookingSchema.index({ 'invitee.email': 1 });

// Create and export Booking model
const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
export default Booking;