import mongoose, { Schema, Model } from 'mongoose';

/** Opinia podopiecznego o swoim trenerze. Jedna na parę trener–sportowiec, można ją edytować. */
export interface ITrainerReview {
    _id: string;
    trainerId: string;
    athleteId: string;
    athleteName: string;
    rating: number; // 1–5
    text?: string;
    createdAt: Date;
    updatedAt: Date;
}

const TrainerReviewSchema = new Schema<ITrainerReview>(
    {
        trainerId: { type: String, required: true },
        athleteId: { type: String, required: true },
        athleteName: { type: String, default: '' },
        rating: { type: Number, required: true, min: 1, max: 5 },
        text: { type: String, maxlength: 600, default: '' },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_, ret: Record<string, any>) => {
                ret.id = ret._id.toString();
                delete ret.__v;
                return ret;
            },
        },
    }
);

TrainerReviewSchema.index({ trainerId: 1, athleteId: 1 }, { unique: true });
TrainerReviewSchema.index({ trainerId: 1, createdAt: -1 });

export const TrainerReview: Model<ITrainerReview> =
    mongoose.models.TrainerReview || mongoose.model<ITrainerReview>('TrainerReview', TrainerReviewSchema);
