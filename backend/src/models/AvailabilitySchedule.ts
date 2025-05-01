import mongoose, { Document, Schema } from 'mongoose';

// Define availability interface
interface Availability {
  days: number[];
  startTime: string;
  endTime: string;
}

// Define date override interface
interface DateOverride {
  date: Date;
  availability: {
    startTime: string;
    endTime: string;
  }[];
}

// Define availability schedule interface extending Document
export interface IAvailabilitySchedule extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  timeZone: string;
  availability: Availability[];
  dateOverrides: DateOverride[];
  createdAt: Date;
  updatedAt: Date;
}

// Create availability schedule schema
const availabilityScheduleSchema = new Schema<IAvailabilitySchedule>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    name: {
      type: String,
      required: [true, 'Schedule name is required'],
      trim: true,
    },
    timeZone: {
      type: String,
      required: [true, 'Time zone is required'],
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
    dateOverrides: [
      {
        date: {
          type: Date,
          required: [true, 'Date is required'],
        },
        availability: [
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
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Add indexes
availabilityScheduleSchema.index({ user: 1 });
availabilityScheduleSchema.index({ 'dateOverrides.date': 1 });

// Create and export AvailabilitySchedule model
const AvailabilitySchedule = mongoose.model<IAvailabilitySchedule>('AvailabilitySchedule', availabilityScheduleSchema);
export default AvailabilitySchedule;