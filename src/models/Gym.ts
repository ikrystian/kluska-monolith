import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IGym extends Document {
  _id: string;
  name: string;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
  description?: string;
  amenities?: string[];
  rating?: number;
  ratingCount?: number;
  phoneNumber?: string;
  website?: string;
  cid?: string;
  photoUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GymSchema = new Schema<IGym>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    description: { type: String },
    amenities: [{ type: String }],
    rating: { type: Number, min: 0, max: 5 },
    ratingCount: { type: Number },
    phoneNumber: { type: String },
    website: { type: String },
    cid: { type: String, unique: true, sparse: true },
    photoUrls: [{ type: String }],
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

GymSchema.index({ name: 'text', address: 'text' });
GymSchema.index({ 'location.lat': 1, 'location.lng': 1 });
GymSchema.index({ cid: 1 });

export const Gym: Model<IGym> =
  mongoose.models.Gym || mongoose.model<IGym>('Gym', GymSchema);

