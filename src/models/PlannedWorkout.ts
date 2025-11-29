import mongoose, { Schema, Model } from 'mongoose';

export interface IPlannedWorkout {
    _id: string;
    date: Date;
    workoutName: string;
    exercises: {
        name: string;
        sets?: string;
        reps?: string;
        rest?: string;
        duration?: string;
    }[];
    ownerId: string;
}

const PlannedWorkoutSchema = new Schema<IPlannedWorkout>(
    {
        date: { type: Date, required: true },
        workoutName: { type: String, required: true },
        exercises: [{
            name: { type: String, required: true },
            sets: { type: String },
            reps: { type: String },
            rest: { type: String },
            duration: { type: String },
        }],
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

PlannedWorkoutSchema.index({ ownerId: 1, date: 1 });

export const PlannedWorkout: Model<IPlannedWorkout> =
    mongoose.models.PlannedWorkout || mongoose.model<IPlannedWorkout>('PlannedWorkout', PlannedWorkoutSchema);
