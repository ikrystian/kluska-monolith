import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IStravaActivity extends Document {
    _id: string;
    ownerId: string;
    stravaActivityId: string;
    name: string;
    type: string; // Run, Ride, Swim, etc.
    date: Date;
    distance: number; // in meters
    movingTime: number; // in seconds
    elapsedTime: number; // in seconds
    totalElevationGain?: number; // in meters
    averageSpeed?: number; // in m/s
    maxSpeed?: number; // in m/s
    averageHeartrate?: number; // in bpm
    maxHeartrate?: number; // in bpm
    averageCadence?: number;
    kudosCount?: number;
    map?: {
        summaryPolyline?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const StravaActivitySchema = new Schema<IStravaActivity>(
    {
        ownerId: { type: String, required: true, index: true },
        stravaActivityId: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        date: { type: Date, required: true },
        distance: { type: Number, required: true },
        movingTime: { type: Number, required: true },
        elapsedTime: { type: Number, required: true },
        totalElevationGain: { type: Number },
        averageSpeed: { type: Number },
        maxSpeed: { type: Number },
        averageHeartrate: { type: Number },
        maxHeartrate: { type: Number },
        averageCadence: { type: Number },
        kudosCount: { type: Number },
        map: {
            summaryPolyline: { type: String },
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

StravaActivitySchema.index({ ownerId: 1, date: -1 });
StravaActivitySchema.index({ stravaActivityId: 1 });

export const StravaActivity: Model<IStravaActivity> =
    mongoose.models.StravaActivity || mongoose.model<IStravaActivity>('StravaActivity', StravaActivitySchema);
