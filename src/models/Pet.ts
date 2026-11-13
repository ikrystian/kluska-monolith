import mongoose, { Schema, Model, Document } from 'mongoose';
import { PET_SPECIES, PetSpecies } from '@/lib/pet/catalog';

export interface IPetStat {
  value: number;
  updatedAt: Date;
  /** Do tego momentu wartość nie spada (sycący posiłek). */
  holdUntil?: Date;
}

export interface IPetEquipped {
  head?: string;
  eyes?: string;
  back?: string;
  wrists?: string;
  feet?: string;
}

/** Jeden zwierzak. Stan zmienia wyłącznie `lib/pet/service` — nie ma go w generycznym `/api/db`. */
export interface IPet extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  species: PetSpecies;
  name: string;
  hunger: IPetStat;
  joy: IPetStat;
  equipped: IPetEquipped;
  /** Doświadczenie z biegania i z siłowni — osobno, bo z proporcji wynika sylwetka. */
  runXp: number;
  liftXp: number;
  shineUntil?: Date;
  /** Kiedy osiągnął etap Mistrza — odblokowuje adopcję kolejnego. */
  masteredAt?: Date;
  lastPettedAt?: Date;
  lastPlayedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PetStatSchema = new Schema<IPetStat>(
  {
    value: { type: Number, required: true, min: 0, max: 100 },
    updatedAt: { type: Date, required: true },
    holdUntil: { type: Date },
  },
  { _id: false }
);

const PetSchema = new Schema<IPet>(
  {
    userId: { type: String, required: true },
    species: { type: String, enum: PET_SPECIES, required: true },
    name: { type: String, required: true, trim: true, maxlength: 20 },
    hunger: { type: PetStatSchema, required: true },
    joy: { type: PetStatSchema, required: true },
    equipped: {
      head: { type: String },
      eyes: { type: String },
      back: { type: String },
      wrists: { type: String },
      feet: { type: String },
    },
    runXp: { type: Number, default: 0 },
    liftXp: { type: Number, default: 0 },
    shineUntil: { type: Date },
    masteredAt: { type: Date },
    lastPettedAt: { type: Date },
    lastPlayedAt: { type: Date },
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

// Jeden zwierzak danego gatunku na użytkownika — chroni też przed podwójną adopcją z równoległych żądań.
PetSchema.index({ userId: 1, species: 1 }, { unique: true });

export const Pet: Model<IPet> = mongoose.models.Pet || mongoose.model<IPet>('Pet', PetSchema);
