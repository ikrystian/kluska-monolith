import mongoose, { Schema, Model } from 'mongoose';

export type TrainingSessionStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export interface ITrainingSession {
    _id: string;
    trainerId: string;
    trainerName: string;
    athleteId: string;
    athleteName: string;
    title: string;
    description?: string;
    date: Date;
    duration: number; // w minutach
    location?: string;
    status: TrainingSessionStatus;
    notes?: string;
    workoutId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const TrainingSessionSchema = new Schema<ITrainingSession>(
    {
        trainerId: { type: String, required: true },
        trainerName: { type: String, required: true },
        athleteId: { type: String, required: true },
        athleteName: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String },
        date: { type: Date, required: true },
        duration: { type: Number, required: true, default: 60 },
        location: { type: String },
        status: {
            type: String,
            enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
            default: 'scheduled'
        },
        notes: { type: String },
        workoutId: { type: String },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_, ret) => {
                const obj = ret as any;
                obj.id = obj._id.toString();
                delete obj.__v;
                return obj;
            },
        },
    }
);

// Indeksy dla szybkiego wyszukiwania
TrainingSessionSchema.index({ trainerId: 1, date: 1 });
TrainingSessionSchema.index({ athleteId: 1, date: 1 });
TrainingSessionSchema.index({ trainerId: 1, status: 1 });

export const TrainingSession: Model<ITrainingSession> =
    mongoose.models.TrainingSession || mongoose.model<ITrainingSession>('TrainingSession', TrainingSessionSchema);
