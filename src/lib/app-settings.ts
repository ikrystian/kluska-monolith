import { connectToDatabase } from '@/lib/mongodb';
import { AppSettings, APP_SETTINGS_KEY } from '@/models/AppSettings';

/** Admin-managed settings that apply to every user of the app. */
export interface AppSettingsData {
  halloweenEnabled: boolean;
}

const DEFAULTS: AppSettingsData = {
  halloweenEnabled: true,
};

/** Returns the stored settings, falling back to defaults while none have been saved yet. */
export async function getAppSettings(): Promise<AppSettingsData> {
  await connectToDatabase();
  const doc = await AppSettings.findOne({ key: APP_SETTINGS_KEY }).lean();
  return {
    halloweenEnabled: doc?.halloweenEnabled ?? DEFAULTS.halloweenEnabled,
  };
}

export async function updateAppSettings(patch: Partial<AppSettingsData>): Promise<AppSettingsData> {
  await connectToDatabase();
  const doc = await AppSettings.findOneAndUpdate(
    { key: APP_SETTINGS_KEY },
    { $set: patch },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return {
    halloweenEnabled: doc?.halloweenEnabled ?? DEFAULTS.halloweenEnabled,
  };
}
