import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMessage extends Omit<Document, '_id'> {
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
        (ret as any).id = ret._id.toString();
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1 });

export const Message: Model<IMessage> = 
  mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

