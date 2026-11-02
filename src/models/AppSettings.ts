import mongoose, { Schema, Model, Document } from 'mongoose';

/** Key of the single document that holds the global, admin-managed settings. */
export const APP_SETTINGS_KEY = 'global';

export interface IAppSettings extends Document {
  key: string;
  /**
   * Master switch for the Halloween overlay. The overlay is additionally
   * limited to its yearly date window (20.10 – 1.11) by the client.
   */
  halloweenEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    key: { type: String, required: true, unique: true, default: APP_SETTINGS_KEY },
    halloweenEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const AppSettings: Model<IAppSettings> =
  mongoose.models.AppSettings || mongoose.model<IAppSettings>('AppSettings', AppSettingsSchema);
