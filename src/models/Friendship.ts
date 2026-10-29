import mongoose, { Schema, Model, Document } from 'mongoose';

export type FriendshipStatus = 'pending' | 'accepted';

export interface IFriendship extends Document {
  _id: mongoose.Types.ObjectId;
  requesterId: string; // User who sent the invitation
  recipientId: string; // User who received it
  /** Both ids sorted and joined — one friendship per pair, whoever invited first. */
  pairKey: string;
  status: FriendshipStatus;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function friendshipPairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    requesterId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    pairKey: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    acceptedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

FriendshipSchema.index({ requesterId: 1, status: 1 });
FriendshipSchema.index({ recipientId: 1, status: 1 });

export const Friendship: Model<IFriendship> =
  mongoose.models.Friendship || mongoose.model<IFriendship>('Friendship', FriendshipSchema);
