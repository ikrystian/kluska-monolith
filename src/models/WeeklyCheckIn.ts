import mongoose, { Schema, Model, Document } from 'mongoose';

export type CheckInStatus = 'pending' | 'submitted' | 'reviewed';

export interface ICheckInResponses {
    trainingRating: number;      // 1-10
    physicalFeeling: number;     // 1-10
    dietRating: number;          // 1-10
    hadIssues: boolean;
    issuesDescription?: string;
    additionalNotes?: string;
}

export interface IWeeklyCheckIn extends Document {
    _id: mongoose.Types.ObjectId;
    athleteId: string;
    trainerId: string;
    weekStartDate: Date;         // Monday of the week
    submittedAt?: Date;          // Null = not filled yet
    status: CheckInStatus;
    responses?: ICheckInResponses;
    measurementId?: string;      // Reference to BodyMeasurement document
    trainerNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CheckInResponsesSchema = new Schema<ICheckInResponses>(
    {
        trainingRating: { type: Number, min: 1, max: 10 },
        physicalFeeling: { type: Number, min: 1, max: 10 },
        dietRating: { type: Number, min: 1, max: 10 },
        hadIssues: { type: Boolean, default: false },
        issuesDescription: { type: String },
        additionalNotes: { type: String },
    },
    { _id: false }
);

const WeeklyCheckInSchema = new Schema<IWeeklyCheckIn>(
    {
        athleteId: { type: String, required: true },
        trainerId: { type: String, required: true },
        weekStartDate: { type: Date, required: true },
        submittedAt: { type: Date },
        status: {
            type: String,
            enum: ['pending', 'submitted', 'reviewed'],
            default: 'pending',
        },
        responses: { type: CheckInResponsesSchema },
        measurementId: { type: String },
        trainerNotes: { type: String },
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

// Indexes for efficient queries
WeeklyCheckInSchema.index({ athleteId: 1, weekStartDate: -1 });
WeeklyCheckInSchema.index({ trainerId: 1, weekStartDate: -1 });
WeeklyCheckInSchema.index({ trainerId: 1, status: 1 });
WeeklyCheckInSchema.index({ status: 1, weekStartDate: -1 });

export const WeeklyCheckIn: Model<IWeeklyCheckIn> =
    mongoose.models.WeeklyCheckIn || mongoose.model<IWeeklyCheckIn>('WeeklyCheckIn', WeeklyCheckInSchema);
