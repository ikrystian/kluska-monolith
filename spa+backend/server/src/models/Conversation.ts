import mongoose, { Schema, Model } from 'mongoose';

export interface IConversation {
  _id: string;
  conversationId: string;
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
    conversationId: { type: String, required: true, unique: true },
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
        (ret as any).id = ret._id.toString();
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// ConversationSchema.index({ conversationId: 1 }); - Removed as it's already unique defined in schema
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ trainerId: 1 });
ConversationSchema.index({ athleteId: 1 });
ConversationSchema.index({ updatedAt: -1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);

mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);


