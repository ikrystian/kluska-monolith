import mongoose, { Schema, Model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type Gender = 'male' | 'female' | 'other';
export type TrainingLevelType = 'beginner' | 'intermediate' | 'advanced';

export interface ITrainerCard {
  published?: boolean;
  headline?: string;
  bio?: string;
  coverImageUrl?: string;
  specializations?: string[];
  experienceYears?: number;
  languages?: string[];
  cooperationMode?: 'gym' | 'online' | 'both';
  certifications?: { name: string; year?: number }[];
  services?: { title: string; description?: string; price?: string; highlighted?: boolean }[];
  gallery?: string[];
  testimonials?: { author: string; text: string }[];
  ctaText?: string;
  availability?: 'open' | 'limited' | 'closed';
  responseTime?: 'hour' | 'day' | 'few_days';
  achievements?: string[];
  faq?: { question: string; answer: string }[];
}

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'athlete' | 'trainer' | 'admin';
  // Guest accounts (Capacitor devices without registration): one user per
  // device, looked up by the device identifier instead of credentials.
  isGuest?: boolean;
  guestDeviceId?: string;
  // Only accounts created through public registration carry `false` here;
  // documents without the field (legacy, seeded, guests) are not gated.
  emailVerified?: boolean;
  emailVerifiedAt?: Date;
  emailVerificationTokenHash?: string;
  emailVerificationExpires?: Date;
  emailVerificationSentAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  passwordResetSentAt?: Date;
  termsAcceptedAt?: Date;
  termsVersion?: string;
  avatarUrl?: string;
  location?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  trainerId?: string;
  favoriteGymIds?: string[];
  trainerCard?: ITrainerCard;
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
    isGuest: { type: Boolean, default: false },
    guestDeviceId: { type: String, unique: true, sparse: true },
    // No defaults on purpose: Mongoose would apply them to existing documents
    // on read and lock every legacy account out.
    emailVerified: { type: Boolean },
    emailVerifiedAt: { type: Date },
    emailVerificationTokenHash: { type: String, index: { sparse: true } },
    emailVerificationExpires: { type: Date },
    emailVerificationSentAt: { type: Date },
    passwordResetTokenHash: { type: String, index: { sparse: true } },
    passwordResetExpires: { type: Date },
    passwordResetSentAt: { type: Date },
    termsAcceptedAt: { type: Date },
    termsVersion: { type: String },
    avatarUrl: { type: String },
    location: { type: String },
    socialLinks: {
      instagram: { type: String },
      facebook: { type: String },
      twitter: { type: String },
    },
    trainerId: { type: String },
    favoriteGymIds: [{ type: String }],
    trainerCard: {
      type: new Schema(
        {
          published: { type: Boolean, default: false },
          headline: { type: String, maxlength: 100 },
          bio: { type: String, maxlength: 1500 },
          coverImageUrl: { type: String },
          specializations: [{ type: String, maxlength: 40 }],
          experienceYears: { type: Number, min: 0, max: 80 },
          languages: [{ type: String, maxlength: 30 }],
          cooperationMode: { type: String, enum: ['gym', 'online', 'both'] },
          certifications: [{ name: { type: String, required: true, maxlength: 120 }, year: { type: Number }, _id: false }],
          services: [
            {
              title: { type: String, required: true, maxlength: 80 },
              description: { type: String, maxlength: 400 },
              price: { type: String, maxlength: 60 },
              highlighted: { type: Boolean, default: false },
              _id: false,
            },
          ],
          gallery: [{ type: String }],
          testimonials: [{ author: { type: String, required: true, maxlength: 60 }, text: { type: String, required: true, maxlength: 500 }, _id: false }],
          ctaText: { type: String, maxlength: 40 },
          availability: { type: String, enum: ['open', 'limited', 'closed'] },
          responseTime: { type: String, enum: ['hour', 'day', 'few_days'] },
          achievements: [{ type: String, maxlength: 80 }],
          faq: [{ question: { type: String, required: true, maxlength: 140 }, answer: { type: String, required: true, maxlength: 600 }, _id: false }],
        },
        { _id: false }
      ),
    },
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
      transform: (_, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        // Credentials never leave the server; clients only need to know
        // whether Strava is linked.
        ret.stravaConnected = Boolean(ret.stravaAccessToken);
        delete ret.password;
        delete ret.stravaAccessToken;
        delete ret.stravaRefreshToken;
        delete ret.emailVerificationTokenHash;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpires;
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

