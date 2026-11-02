import mongoose, { Schema, Model } from 'mongoose';

export interface IAchievement {
    _id: string;
    title: string;
    description: string;
    date: Date;
    photoURLs: string[];
    ownerId: string;
}

const AchievementSchema = new Schema<IAchievement>(
    {
        title: { type: String, required: true },
        // Optional in the UI, which sends '' when left blank — `required` rejects empty strings.
        description: { type: String, default: '' },
        date: { type: Date, required: true },
        photoURLs: [{ type: String }],
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

AchievementSchema.index({ ownerId: 1 });

export const Achievement: Model<IAchievement> =
    mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema);
