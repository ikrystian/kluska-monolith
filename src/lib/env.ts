import { z } from 'zod';

const envSchema = z.object({
    MONGO_DB_URI: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
    NEXTAUTH_URL: z.string().url().optional(),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
