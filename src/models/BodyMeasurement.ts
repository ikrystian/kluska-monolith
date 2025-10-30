import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IBodyMeasurement extends Document {
  _id: string;
  ownerId: string;
  date: Date;
  weight: number;
  circumferences: {
    biceps?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    thigh?: number;
    calf?: number;
    neck?: number;
  };
  photoURLs?: string[];
  sharedWithTrainer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BodyMeasurementSchema = new Schema<IBodyMeasurement>(
  {
    ownerId: { type: String, required: true },
    date: { type: Date, required: true },
    weight: { type: Number, required: true },
    circumferences: {
      biceps: { type: Number },
      chest: { type: Number },
      waist: { type: Number },
      hips: { type: Number },
      thigh: { type: Number },
      calf: { type: Number },
      neck: { type: Number },
    },
    photoURLs: [{ type: String }],
    sharedWithTrainer: { type: Boolean, default: false },
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

BodyMeasurementSchema.index({ ownerId: 1, date: -1 });

export const BodyMeasurement: Model<IBodyMeasurement> = 
  mongoose.models.BodyMeasurement || mongoose.model<IBodyMeasurement>('BodyMeasurement', BodyMeasurementSchema);

