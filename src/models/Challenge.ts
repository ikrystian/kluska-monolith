import mongoose, { Schema, Model, Document } from 'mongoose';

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface IChallenge extends Document {
    _id: mongoose.Types.ObjectId;
    challengerId: string;        // User who created the challenge
    challengedId: string;        // User who received the challenge
    challengerName: string;      // Cached name for display
    challengedName: string;      // Cached name for display
    challengerAvatarUrl?: string;
    challengedAvatarUrl?: string;
    targetKm: number;            // Target kilometers to run
    startDate?: Date;            // When challenge starts (set on acceptance)
    endDate: Date;               // Challenge deadline
    status: ChallengeStatus;
    challengerProgress: number;  // Cached km progress
    challengedProgress: number;  // Cached km progress
    winnerId?: string;           // Set when challenge completes
    createdAt: Date;
    updatedAt: Date;
}

const ChallengeSchema = new Schema<IChallenge>(
    {
        challengerId: { type: String, required: true, index: true },
        challengedId: { type: String, required: true, index: true },
        challengerName: { type: String, required: true },
        challengedName: { type: String, required: true },
        challengerAvatarUrl: { type: String },
        challengedAvatarUrl: { type: String },
        targetKm: { type: Number, required: true, min: 1 },
        startDate: { type: Date },
        endDate: { type: Date, required: true },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'],
            default: 'pending',
        },
        challengerProgress: { type: Number, default: 0 },
        challengedProgress: { type: Number, default: 0 },
        winnerId: { type: String },
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

// Compound indexes for efficient queries
ChallengeSchema.index({ challengerId: 1, status: 1 });
ChallengeSchema.index({ challengedId: 1, status: 1 });
ChallengeSchema.index({ endDate: 1, status: 1 });

export const Challenge: Model<IChallenge> =
    mongoose.models.Challenge || mongoose.model<IChallenge>('Challenge', ChallengeSchema);
