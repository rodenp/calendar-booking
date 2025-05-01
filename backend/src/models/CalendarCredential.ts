import mongoose, { Document, Schema } from 'mongoose';

// Define calendar interface
interface Calendar {
  externalId: string;
  name: string;
  primary: boolean;
  readOnly: boolean;
  integration: string;
}

// Define calendar credential interface extending Document
export interface ICalendarCredential extends Document {
  user: mongoose.Types.ObjectId;
  type: string;
  key: Record<string, any>;
  appId: string;
  expiresAt?: Date;
  refreshToken?: string;
  syncEnabled: boolean;
  calendars: Calendar[];
  createdAt: Date;
  updatedAt: Date;
}

// Create calendar credential schema
const calendarCredentialSchema = new Schema<ICalendarCredential>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    type: {
      type: String,
      required: [true, 'Calendar type is required'],
      enum: ['google', 'outlook', 'apple'],
    },
    key: {
      type: Schema.Types.Mixed,
      required: [true, 'Key is required'],
    },
    appId: {
      type: String,
      required: [true, 'App ID is required'],
    },
    expiresAt: {
      type: Date,
    },
    refreshToken: {
      type: String,
    },
    syncEnabled: {
      type: Boolean,
      default: true,
    },
    calendars: [
      {
        externalId: {
          type: String,
          required: [true, 'Calendar external ID is required'],
        },
        name: {
          type: String,
          required: [true, 'Calendar name is required'],
        },
        primary: {
          type: Boolean,
          default: false,
        },
        readOnly: {
          type: Boolean,
          default: false,
        },
        integration: {
          type: String,
          required: [true, 'Calendar integration is required'],
          enum: ['google', 'outlook', 'apple'],
        },
      },
    ],
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Add indexes
calendarCredentialSchema.index({ user: 1 });
calendarCredentialSchema.index({ user: 1, type: 1 }, { unique: true });

// Create and export CalendarCredential model
const CalendarCredential = mongoose.model<ICalendarCredential>('CalendarCredential', calendarCredentialSchema);
export default CalendarCredential;