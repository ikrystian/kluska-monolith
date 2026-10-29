import mongoose, { Schema, Model, Document } from 'mongoose';

/** Short text status shown on the friends wall (visible to the author's friends). */
export interface ISocialStatus extends Document {
  _id: mongoose.Types.ObjectId;
  authorId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const SocialStatusSchema = new Schema<ISocialStatus>(
  {
    authorId: { type: String, required: true },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 280 },
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

SocialStatusSchema.index({ authorId: 1, createdAt: -1 });

export const SocialStatus: Model<ISocialStatus> =
  mongoose.models.SocialStatus || mongoose.model<ISocialStatus>('SocialStatus', SocialStatusSchema);
