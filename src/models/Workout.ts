import mongoose, { Schema, Model, Document } from 'mongoose';
import { MuscleGroup, ExerciseSeries, TrainingLevel } from '@/lib/types';

export interface IWorkout extends Document {
    _id: string;
    name: string;
    imageUrl?: string;
    level: TrainingLevel;
    durationMinutes: number;
    exerciseSeries: ExerciseSeries[];
    ownerId: string;
    description?: string;
    status: 'draft' | 'published';
    createdAt: Date;
    updatedAt: Date;
}

const WorkoutSchema = new Schema<IWorkout>(
    {
        name: { type: String, required: true },
        imageUrl: { type: String },
        level: { type: String, enum: Object.values(TrainingLevel), required: true },
        durationMinutes: { type: Number, required: true },
        exerciseSeries: [
            {
                exercise: { type: Schema.Types.Mixed, required: true }, // Storing full exercise object for now, or could be ref
                tempo: { type: String },
                tip: { type: String },
                sets: [
                    {
                        number: { type: Number, required: true },
                        type: { type: String, required: true },
                        reps: { type: Number, required: true },
                        weight: { type: Number, required: true },
                        restTimeSeconds: { type: Number, required: true },
                        completed: { type: Boolean },
                        duration: { type: Number },
                    },
                ],
            },
        ],
        ownerId: { type: String, required: true },
        description: { type: String },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'published'
        },
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

WorkoutSchema.index({ ownerId: 1 });
WorkoutSchema.index({ level: 1 });

export const Workout: Model<IWorkout> =
    mongoose.models.Workout || mongoose.model<IWorkout>('Workout', WorkoutSchema);
