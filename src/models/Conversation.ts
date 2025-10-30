import mongoose, { Schema, Model } from 'mongoose';

export interface IConversation {
  _id: string;
  participants: string[];
  trainerId: string;
  athleteId: string;
  trainerName: string;
  athleteName: string;
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: Date;
  } | null;
  updatedAt: Date;
  unreadCount?: {
    [userId: string]: number;
  };
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: String, required: true }],
    trainerId: { type: String, required: true },
    athleteId: { type: String, required: true },
    trainerName: { type: String, required: true },
    athleteName: { type: String, required: true },
    lastMessage: {
      text: { type: String },
      senderId: { type: String },
      createdAt: { type: Date },
    },
    unreadCount: { type: Map, of: Number },
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

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ trainerId: 1 });
ConversationSchema.index({ athleteId: 1 });
ConversationSchema.index({ updatedAt: -1 });

export const Conversation: Model<IConversation> = 
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);

// Message
export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: String, required: true },
    senderId: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message: Model<IMessage> = 
  mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

// Body Measurement
export interface IBodyMeasurement {
  _id: string;
  ownerId: string;
  date: Date;
  weight: number;
  circumferences: {
    biceps?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    thigh?: number;
  };
  photoURLs?: string[];
  sharedWithTrainer: boolean;
}

const BodyMeasurementSchema = new Schema<IBodyMeasurement>(
  {
    ownerId: { type: String, required: true },
    date: { type: Date, required: true },
    weight: { type: Number, required: true },
    circumferences: {
      biceps: { type: Number },
      chest: { type: Number },
      waist: { type: Number },
      hips: { type: Number },
      thigh: { type: Number },
    },
    photoURLs: [{ type: String }],
    sharedWithTrainer: { type: Boolean, default: false },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

BodyMeasurementSchema.index({ ownerId: 1, date: -1 });

export const BodyMeasurement: Model<IBodyMeasurement> = 
  mongoose.models.BodyMeasurement || mongoose.model<IBodyMeasurement>('BodyMeasurement', BodyMeasurementSchema);

// Trainer Request
export interface ITrainerRequest {
  _id: string;
  athleteId: string;
  athleteName: string;
  trainerId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

const TrainerRequestSchema = new Schema<ITrainerRequest>(
  {
    athleteId: { type: String, required: true },
    athleteName: { type: String, required: true },
    trainerId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

TrainerRequestSchema.index({ trainerId: 1, status: 1 });
TrainerRequestSchema.index({ athleteId: 1 });

export const TrainerRequest: Model<ITrainerRequest> = 
  mongoose.models.TrainerRequest || mongoose.model<ITrainerRequest>('TrainerRequest', TrainerRequestSchema);

// Meal
export interface IMeal {
  _id: string;
  ownerId: string;
  date: Date;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  foodItems: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
}

const MealSchema = new Schema<IMeal>(
  {
    ownerId: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], required: true },
    foodItems: [{
      name: { type: String, required: true },
      calories: { type: Number, required: true },
      protein: { type: Number, required: true },
      carbs: { type: Number, required: true },
      fat: { type: Number, required: true },
    }],
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

MealSchema.index({ ownerId: 1, date: -1 });

export const Meal: Model<IMeal> = 
  mongoose.models.Meal || mongoose.model<IMeal>('Meal', MealSchema);

// Running Session
export interface IRunningSession {
  _id: string;
  date: Date;
  distance: number;
  duration: number;
  avgPace: number;
  notes?: string;
  ownerId: string;
}

const RunningSessionSchema = new Schema<IRunningSession>(
  {
    date: { type: Date, required: true },
    distance: { type: Number, required: true },
    duration: { type: Number, required: true },
    avgPace: { type: Number, required: true },
    notes: { type: String },
    ownerId: { type: String, required: true },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

RunningSessionSchema.index({ ownerId: 1, date: -1 });

export const RunningSession: Model<IRunningSession> = 
  mongoose.models.RunningSession || mongoose.model<IRunningSession>('RunningSession', RunningSessionSchema);

// Achievement
export interface IAchievement {
  _id: string;
  title: string;
  description: string;
  date: Date;
  photoURLs: string[];
  ownerId: string;
}

const AchievementSchema = new Schema<IAchievement>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    photoURLs: [{ type: String }],
    ownerId: { type: String, required: true },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

AchievementSchema.index({ ownerId: 1, date: -1 });

export const Achievement: Model<IAchievement> = 
  mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema);

// Gym
export interface IGym {
  _id: string;
  name: string;
  address: string;
}

const GymSchema = new Schema<IGym>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Gym: Model<IGym> = 
  mongoose.models.Gym || mongoose.model<IGym>('Gym', GymSchema);

