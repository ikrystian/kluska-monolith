import mongoose, { Schema, Model, Document } from 'mongoose';

export type SurveyQuestionType = 'open' | 'closed';
export type SurveyStatus = 'draft' | 'active' | 'closed';

export interface ISurveyQuestion {
    id: string;
    type: SurveyQuestionType;
    text: string;
    options?: string[]; // For closed questions
    required: boolean;
}

export interface ISurvey extends Omit<Document, '_id'> {
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    trainerId: string;
    trainerName: string;
    questions: ISurveyQuestion[];
    assignedAthleteIds: string[];
    status: SurveyStatus;
    createdAt: Date;
    updatedAt: Date;
}

const SurveyQuestionSchema = new Schema<ISurveyQuestion>(
    {
        id: { type: String, required: true },
        type: {
            type: String,
            enum: ['open', 'closed'],
            required: true,
        },
        text: { type: String, required: true },
        options: [{ type: String }],
        required: { type: Boolean, default: true },
    },
    { _id: false }
);

const SurveySchema = new Schema<ISurvey>(
    {
        title: { type: String, required: true },
        description: { type: String },
        trainerId: { type: String, required: true },
        trainerName: { type: String, required: true },
        questions: [SurveyQuestionSchema],
        assignedAthleteIds: [{ type: String }],
        status: {
            type: String,
            enum: ['draft', 'active', 'closed'],
            default: 'active',
        },
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

SurveySchema.index({ trainerId: 1 });
SurveySchema.index({ assignedAthleteIds: 1 });
SurveySchema.index({ status: 1 });
SurveySchema.index({ createdAt: -1 });

export const Survey: Model<ISurvey> =
    mongoose.models.Survey || mongoose.model<ISurvey>('Survey', SurveySchema);
