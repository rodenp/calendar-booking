import mongoose, { Document, Schema } from 'mongoose';

// Define option interface
interface Option {
  startTime: Date;
  endTime: Date;
  voters: string[]; // Email addresses
}

// Define participant interface
interface Participant {
  email: string;
  name: string;
  status: string;
  token: string;
}

// Define final option interface
interface FinalOption {
  startTime: Date;
  endTime: Date;
}

// Define meeting poll interface extending Document
export interface IMeetingPoll extends Document {
  creator: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  options: Option[];
  participants: Participant[];
  finalOption?: FinalOption;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

// Create meeting poll schema
const meetingPollSchema = new Schema<IMeetingPoll>(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    name: {
      type: String,
      required: [true, 'Poll name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    options: [
      {
        startTime: {
          type: Date,
          required: [true, 'Option start time is required'],
        },
        endTime: {
          type: Date,
          required: [true, 'Option end time is required'],
        },
        voters: [
          {
            type: String,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
          },
        ],
      },
    ],
    participants: [
      {
        email: {
          type: String,
          required: [true, 'Participant email is required'],
          match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        name: {
          type: String,
          required: [true, 'Participant name is required'],
          trim: true,
        },
        status: {
          type: String,
          enum: ['pending', 'voted', 'declined'],
          default: 'pending',
        },
        token: {
          type: String,
          required: [true, 'Participant token is required'],
        },
      },
    ],
    finalOption: {
      startTime: {
        type: Date,
      },
      endTime: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'finalized', 'cancelled'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Add indexes
meetingPollSchema.index({ creator: 1 });
meetingPollSchema.index({ status: 1 });
meetingPollSchema.index({ expiresAt: 1 });
meetingPollSchema.index({ 'participants.email': 1 });

// Create and export MeetingPoll model
const MeetingPoll = mongoose.model<IMeetingPoll>('MeetingPoll', meetingPollSchema);
export default MeetingPoll;