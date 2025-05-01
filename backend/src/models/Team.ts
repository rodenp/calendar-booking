import mongoose, { Document, Schema } from 'mongoose';

// Define team member interface
interface TeamMember {
  user: mongoose.Types.ObjectId;
  role: string;
  joinedAt: Date;
}

// Define team settings interface
interface TeamSettings {
  logo?: string;
  brandColor?: string;
  hideCalendlyBranding: boolean;
}

// Define team interface extending Document
export interface ITeam extends Document {
  name: string;
  slug: string;
  owner: mongoose.Types.ObjectId;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
  settings: TeamSettings;
}

// Create team schema
const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Team slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team owner is required'],
    },
    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: [true, 'Team member user is required'],
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    settings: {
      logo: {
        type: String,
      },
      brandColor: {
        type: String,
        match: [/^#[0-9A-Fa-f]{6}$/, 'Brand color must be a valid hex color code'],
      },
      hideCalendlyBranding: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Add indexes
teamSchema.index({ slug: 1 }, { unique: true });
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });

// Create and export Team model
const Team = mongoose.model<ITeam>('Team', teamSchema);
export default Team;