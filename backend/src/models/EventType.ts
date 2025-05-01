import mongoose, { Document, Schema } from 'mongoose';

// Define location interface
interface Location {
  type: string;
  data?: Record<string, any>;
}

// Define time slots interface
interface TimeSlots {
  incrementInMinutes: number;
  minimumBookingNotice: number;
  bufferTimeBefore: number;
  bufferTimeAfter: number;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  maxBookingsPerDay?: number;
}

// Define availability interface
interface Availability {
  days: number[];
  startTime: string;
  endTime: string;
}

// Define custom availability interface
interface CustomAvailability {
  date: Date;
  slots: {
    startTime: string;
    endTime: string;
  }[];
}

// Define form field interface
interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

// Define event type interface extending Document
export interface IEventType extends Document {
  title: string;
  slug: string;
  description?: string;
  length: number;
  owner: {
    type: string;
    id: mongoose.Types.ObjectId;
  };
  eventName: string;
  locations: Location[];
  color: string;
  timeSlots: TimeSlots;
  availability: Availability[];
  customAvailability?: CustomAvailability[];
  formFields: FormField[];
  workflows: mongoose.Types.ObjectId[];
  disableGuests: boolean;
  hideEventType: boolean;
  schedulingType: string;
  teamMembers?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Create event type schema
const eventTypeSchema = new Schema<IEventType>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    description: {
      type: String,
      trim: true,
    },
    length: {
      type: Number,
      required: [true, 'Length is required'],
      min: [1, 'Length must be at least 1 minute'],
    },
    owner: {
      type: {
        type: String,
        required: [true, 'Owner type is required'],
        enum: ['user', 'team'],
      },
      id: {
        type: Schema.Types.ObjectId,
        required: [true, 'Owner ID is required'],
        refPath: 'owner.type',
      },
    },
    eventName: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    locations: [
      {
        type: {
          type: String,
          required: [true, 'Location type is required'],
          enum: ['inPerson', 'phone', 'googleMeet', 'zoom', 'teams', 'custom'],
        },
        data: {
          type: Schema.Types.Mixed,
        },
      },
    ],
    color: {
      type: String,
      default: '#3182ce',
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color code'],
    },
    timeSlots: {
      incrementInMinutes: {
        type: Number,
        required: [true, 'Increment in minutes is required'],
        enum: [5, 10, 15, 20, 30, 45, 60, 90, 120],
        default: 15,
      },
      minimumBookingNotice: {
        type: Number,
        default: 0,
        min: 0,
      },
      bufferTimeBefore: {
        type: Number,
        default: 0,
        min: 0,
      },
      bufferTimeAfter: {
        type: Number,
        default: 0,
        min: 0,
      },
      dateRangeStart: {
        type: Date,
      },
      dateRangeEnd: {
        type: Date,
      },
      maxBookingsPerDay: {
        type: Number,
        min: 1,
      },
    },
    availability: [
      {
        days: {
          type: [Number],
          required: [true, 'Days are required'],
          validate: {
            validator: function(days: number[]) {
              return days.every(day => day >= 0 && day <= 6);
            },
            message: 'Days must be between 0 (Sunday) and 6 (Saturday)',
          },
        },
        startTime: {
          type: String,
          required: [true, 'Start time is required'],
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'],
        },
        endTime: {
          type: String,
          required: [true, 'End time is required'],
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'],
        },
      },
    ],
    customAvailability: [
      {
        date: {
          type: Date,
          required: [true, 'Date is required'],
        },
        slots: [
          {
            startTime: {
              type: String,
              required: [true, 'Start time is required'],
              match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'],
            },
            endTime: {
              type: String,
              required: [true, 'End time is required'],
              match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'],
            },
          },
        ],
      },
    ],
    formFields: [
      {
        id: {
          type: String,
          required: [true, 'Field ID is required'],
        },
        type: {
          type: String,
          required: [true, 'Field type is required'],
          enum: ['text', 'email', 'phone', 'textarea', 'select', 'multiselect', 'checkbox', 'radio', 'number', 'date'],
        },
        label: {
          type: String,
          required: [true, 'Field label is required'],
        },
        placeholder: {
          type: String,
        },
        required: {
          type: Boolean,
          default: false,
        },
        options: {
          type: [String],
        },
      },
    ],
    workflows: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Workflow',
      },
    ],
    disableGuests: {
      type: Boolean,
      default: false,
    },
    hideEventType: {
      type: Boolean,
      default: false,
    },
    schedulingType: {
      type: String,
      required: [true, 'Scheduling type is required'],
      enum: ['individual', 'roundRobin', 'collective'],
      default: 'individual',
    },
    teamMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Add indexes
eventTypeSchema.index({ slug: 1 });
eventTypeSchema.index({ 'owner.id': 1 });
eventTypeSchema.index({ 'owner.type': 1, 'owner.id': 1 });

// Create and export EventType model
const EventType = mongoose.model<IEventType>('EventType', eventTypeSchema);
export default EventType;