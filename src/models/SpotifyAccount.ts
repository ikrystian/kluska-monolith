import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * Deliberately a separate collection from User (and left out of the generic
 * /api/db/[collection] modelMap) so the OAuth tokens are only ever reachable
 * through the dedicated /api/spotify/* routes, which check auth and never
 * echo the tokens back to the client — unlike the Strava fields on User,
 * which the generic db route returns as-is.
 */
export interface ISpotifyAccount extends Document {
  _id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  spotifyUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SpotifyAccountSchema = new Schema<ISpotifyAccount>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    tokenExpiresAt: { type: Date, required: true },
    spotifyUserId: { type: String },
  },
  { timestamps: true }
);

export const SpotifyAccount: Model<ISpotifyAccount> =
  mongoose.models.SpotifyAccount || mongoose.model<ISpotifyAccount>('SpotifyAccount', SpotifyAccountSchema);
