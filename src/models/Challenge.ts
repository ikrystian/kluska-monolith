import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * pending   – sent, waiting for the challenged friend's answer
 * accepted  – the race is on (runs from `startDate` count)
 * declined  – the challenged friend said no
 * cancelled – the challenger withdrew it before it was answered
 * expired   – nobody answered before `endDate`
 * completed – settled: someone reached the target first, the deadline passed, or a runner gave up
 */
export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'expired';

/** How a completed challenge was decided. */
export type ChallengeOutcome = 'target' | 'deadline' | 'forfeit';

export const CHALLENGE_STATUSES: ChallengeStatus[] = ['pending', 'accepted', 'declined', 'completed', 'cancelled', 'expired'];

export interface IChallenge extends Document {
    _id: mongoose.Types.ObjectId;
    challengerId: string;        // User who created the challenge
    challengedId: string;        // User who received the challenge
    challengerName: string;      // Cached display name (nickname or first name)
    challengedName: string;      // Cached display name (nickname or first name)
    challengerAvatarUrl?: string;
    challengedAvatarUrl?: string;
    targetKm: number;            // First to run this many km wins
    message?: string;            // Optional note from the challenger
    startDate?: Date;            // When the race started (set on acceptance)
    endDate: Date;               // Deadline
    status: ChallengeStatus;
    challengerProgress: number;  // Cached km progress
    challengedProgress: number;  // Cached km progress
    challengerReachedAt?: Date;  // Date of the run that took the challenger to the target
    challengedReachedAt?: Date;  // Date of the run that took the challenged to the target
    winnerId?: string;           // Set when the challenge completes (absent = draw)
    outcome?: ChallengeOutcome;
    completedAt?: Date;
    rewardPoints?: number;       // FitCoins granted to the winner
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
        message: { type: String, maxlength: 140 },
        startDate: { type: Date },
        endDate: { type: Date, required: true },
        status: {
            type: String,
            enum: CHALLENGE_STATUSES,
            default: 'pending',
        },
        challengerProgress: { type: Number, default: 0 },
        challengedProgress: { type: Number, default: 0 },
        challengerReachedAt: { type: Date },
        challengedReachedAt: { type: Date },
        winnerId: { type: String },
        outcome: { type: String, enum: ['target', 'deadline', 'forfeit'] },
        completedAt: { type: Date },
        rewardPoints: { type: Number },
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
