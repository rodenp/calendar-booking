import mongoose, { Document, Schema } from 'mongoose';

// Define trigger interface
interface Trigger {
  type: string;
  timeBeforeInMinutes?: number;
  timeAfterInMinutes?: number;
}

// Define action interface
interface Action {
  type: string;
  template?: string;
  subject?: string;
  body?: string;
  includeCalendarEvent?: boolean;
  smsBody?: string;
  webhookUrl?: string;
  webhookPayload?: Record<string, any>;
}

// Define workflow interface extending Document
export interface IWorkflow extends Document {
  name: string;
  owner: {
    type: string;
    id: mongoose.Types.ObjectId;
  };
  trigger: Trigger;
  actions: Action[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create workflow schema
const workflowSchema = new Schema<IWorkflow>(
  {
    name: {
      type: String,
      required: [true, 'Workflow name is required'],
      trim: true,
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
    trigger: {
      type: {
        type: String,
        required: [true, 'Trigger type is required'],
        enum: ['NEW_EVENT', 'EVENT_CANCELLED', 'BEFORE_EVENT', 'AFTER_EVENT'],
      },
      timeBeforeInMinutes: {
        type: Number,
        min: 0,
        validate: {
          validator: function(this: IWorkflow) {
            return this.trigger.type !== 'BEFORE_EVENT' || this.trigger.timeBeforeInMinutes !== undefined;
          },
          message: 'Time before in minutes is required for BEFORE_EVENT trigger',
        },
      },
      timeAfterInMinutes: {
        type: Number,
        min: 0,
        validate: {
          validator: function(this: IWorkflow) {
            return this.trigger.type !== 'AFTER_EVENT' || this.trigger.timeAfterInMinutes !== undefined;
          },
          message: 'Time after in minutes is required for AFTER_EVENT trigger',
        },
      },
    },
    actions: [
      {
        type: {
          type: String,
          required: [true, 'Action type is required'],
          enum: ['EMAIL', 'SMS', 'WEBHOOK'],
        },
        template: {
          type: String,
          validate: {
            validator: function(this: any) {
              return this.type !== 'EMAIL' || this.template !== undefined;
            },
            message: 'Template is required for EMAIL action',
          },
        },
        subject: {
          type: String,
          validate: {
            validator: function(this: any) {
              return this.type !== 'EMAIL' || this.subject !== undefined;
            },
            message: 'Subject is required for EMAIL action',
          },
        },
        body: {
          type: String,
          validate: {
            validator: function(this: any) {
              return this.type !== 'EMAIL' || this.body !== undefined;
            },
            message: 'Body is required for EMAIL action',
          },
        },
        includeCalendarEvent: {
          type: Boolean,
          default: false,
        },
        smsBody: {
          type: String,
          validate: {
            validator: function(this: any) {
              return this.type !== 'SMS' || this.smsBody !== undefined;
            },
            message: 'SMS body is required for SMS action',
          },
        },
        webhookUrl: {
          type: String,
          validate: {
            validator: function(this: any) {
              return this.type !== 'WEBHOOK' || this.webhookUrl !== undefined;
            },
            message: 'Webhook URL is required for WEBHOOK action',
          },
        },
        webhookPayload: {
          type: Schema.Types.Mixed,
        },
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Add indexes
workflowSchema.index({ 'owner.id': 1 });
workflowSchema.index({ 'owner.type': 1, 'owner.id': 1 });
workflowSchema.index({ 'trigger.type': 1 });
workflowSchema.index({ active: 1 });

// Create and export Workflow model
const Workflow = mongoose.model<IWorkflow>('Workflow', workflowSchema);
export default Workflow;