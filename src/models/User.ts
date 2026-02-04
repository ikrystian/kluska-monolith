import mongoose, { Schema, Model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type Gender = 'male' | 'female' | 'other';
export type TrainingLevelType = 'beginner' | 'intermediate' | 'advanced';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'athlete' | 'trainer' | 'admin';
  avatarUrl?: string;
  location?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  trainerId?: string;
  favoriteGymIds?: string[];
  assignedDietPlanId?: string;
  // Onboarding fields
  onboardingCompleted?: boolean;
  gender?: Gender;
  dateOfBirth?: Date;
  height?: number; // w cm
  weight?: number; // w kg
  trainingLevel?: TrainingLevelType;
  // Strava integration
  stravaAccessToken?: string;
  stravaRefreshToken?: string;
  stravaTokenExpiresAt?: Date;
  stravaAthleteId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['athlete', 'trainer', 'admin'], required: true },
    avatarUrl: { type: String },
    location: { type: String },
    socialLinks: {
      instagram: { type: String },
      facebook: { type: String },
      twitter: { type: String },
    },
    trainerId: { type: String },
    favoriteGymIds: [{ type: String }],
    assignedDietPlanId: { type: String },
    // Onboarding fields
    onboardingCompleted: { type: Boolean, default: false },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: { type: Date },
    height: { type: Number }, // w cm
    weight: { type: Number }, // w kg
    trainingLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    // Strava integration
    stravaAccessToken: { type: String },
    stravaRefreshToken: { type: String },
    stravaTokenExpiresAt: { type: Date },
    stravaAthleteId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);


UserSchema.index({ role: 1 });
UserSchema.index({ trainerId: 1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

