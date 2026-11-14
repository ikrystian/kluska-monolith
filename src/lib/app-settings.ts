import { connectToDatabase } from '@/lib/mongodb';
import { AppSettings, APP_SETTINGS_KEY } from '@/models/AppSettings';
import { cached, cacheKeys } from '@/lib/server-cache';

/** Admin-managed settings that apply to every user of the app. */
export interface AppSettingsData {
  halloweenEnabled: boolean;
}

const SETTINGS_TTL_MS = 5 * 60_000;

const DEFAULTS: AppSettingsData = {
  halloweenEnabled: true,
};

/** Returns the stored settings, falling back to defaults while none have been saved yet. */
export async function getAppSettings(): Promise<AppSettingsData> {
  // Read by every client on every start (before login); saving settings drops it.
  return cached(cacheKeys.appSettings, { ttlMs: SETTINGS_TTL_MS }, async () => {
    await connectToDatabase();
    const doc = await AppSettings.findOne({ key: APP_SETTINGS_KEY }).lean();
    return {
      halloweenEnabled: doc?.halloweenEnabled ?? DEFAULTS.halloweenEnabled,
    };
  });
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
