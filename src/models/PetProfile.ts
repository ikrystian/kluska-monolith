import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IPetChest {
  id: string;
  /** Skąd skrzynia: rekord siłowy albo najdłuższy bieg. */
  source: 'personal_record' | 'longest_run';
  createdAt: Date;
  openedAt?: Date;
  loot?: { kind: 'coins'; amount: number } | { kind: 'item'; itemKey: string; qty: number };
}

/** Wspólne dla wszystkich zwierzaków użytkownika: ekwipunek, wystrój, skrzynie. */
export interface IPetProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  activePetId?: string;
  /** Jedzenie — zużywalne, więc z licznikiem. */
  inventory: { itemKey: string; qty: number }[];
  /** Zabawki, ubranka i wystrój — kupowane raz. */
  ownedItems: string[];
  room: { background: string; furniture: string[] };
  chests: IPetChest[];
  createdAt: Date;
  updatedAt: Date;
}

const PetProfileSchema = new Schema<IPetProfile>(
  {
    userId: { type: String, required: true, unique: true },
    activePetId: { type: String },
    inventory: [{ _id: false, itemKey: { type: String, required: true }, qty: { type: Number, required: true, min: 0 } }],
    ownedItems: [{ type: String }],
    room: {
      background: { type: String, default: 'bg_room' },
      furniture: [{ type: String }],
    },
    chests: [
      {
        _id: false,
        id: { type: String, required: true },
        source: { type: String, enum: ['personal_record', 'longest_run'], required: true },
        createdAt: { type: Date, default: Date.now },
        openedAt: { type: Date },
        loot: { type: Schema.Types.Mixed },
      },
    ],
  },
  { timestamps: true }
);

export const PetProfile: Model<IPetProfile> =
  mongoose.models.PetProfile || mongoose.model<IPetProfile>('PetProfile', PetProfileSchema);
