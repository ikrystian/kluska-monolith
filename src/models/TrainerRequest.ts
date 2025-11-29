import mongoose, { Schema, Model } from 'mongoose';

export interface ITrainerRequest {
    _id: string;
    athleteId: string;
    athleteName: string;
    trainerId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
}

const TrainerRequestSchema = new Schema<ITrainerRequest>(
    {
        athleteId: { type: String, required: true },
        athleteName: { type: String, required: true },
        trainerId: { type: String, required: true },
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
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

TrainerRequestSchema.index({ trainerId: 1, status: 1 });
TrainerRequestSchema.index({ athleteId: 1 });

export const TrainerRequest: Model<ITrainerRequest> =
    mongoose.models.TrainerRequest || mongoose.model<ITrainerRequest>('TrainerRequest', TrainerRequestSchema);
