import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ISurveyAnswer {
    questionId: string;
    answer: string; // Text for open, selected option for closed
}

export interface ISurveyResponse extends Omit<Document, '_id'> {
    _id: mongoose.Types.ObjectId;
    surveyId: string;
    athleteId: string;
    athleteName: string;
    answers: ISurveyAnswer[];
    submittedAt: Date;
}

const SurveyAnswerSchema = new Schema<ISurveyAnswer>(
    {
        questionId: { type: String, required: true },
        answer: { type: String, required: true },
    },
    { _id: false }
);

const SurveyResponseSchema = new Schema<ISurveyResponse>(
    {
        surveyId: { type: String, required: true },
        athleteId: { type: String, required: true },
        athleteName: { type: String, required: true },
        answers: [SurveyAnswerSchema],
        submittedAt: { type: Date, default: Date.now },
    },
    {
        toJSON: {
            transform: (_, ret: any) => {
                ret.id = ret._id.toString();
                delete ret.__v;
                return ret;
            },
        },
    }
);

SurveyResponseSchema.index({ surveyId: 1, athleteId: 1 }, { unique: true });
SurveyResponseSchema.index({ surveyId: 1 });
SurveyResponseSchema.index({ athleteId: 1 });
SurveyResponseSchema.index({ submittedAt: -1 });

export const SurveyResponse: Model<ISurveyResponse> =
    mongoose.models.SurveyResponse || mongoose.model<ISurveyResponse>('SurveyResponse', SurveyResponseSchema);
