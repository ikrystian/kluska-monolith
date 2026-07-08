import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { signAthleteToken } from '@/lib/jwt';

// Device identifiers we accept: Android ANDROID_ID (hex), iOS
// identifierForVendor (UUID) and the SPA's web fallback (crypto.randomUUID).
const DEVICE_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * Guest login for the Capacitor SPA: exchanges a stable device identifier
 * for a Bearer token, creating a per-device athlete account on first use so
 * everything the guest does is persisted in the database like for any other
 * user. Idempotent — calling it again with the same deviceId returns a fresh
 * token for the same account, which is how the SPA re-authenticates when the
 * long-lived guest token expires.
 */
export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await request.json();

    if (typeof deviceId !== 'string' || !DEVICE_ID_PATTERN.test(deviceId)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy identyfikator urządzenia.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let user = await User.findOne({ guestDeviceId: deviceId });

    if (!user) {
      try {
        user = new User({
          name: 'Gość',
          email: `guest-${deviceId.toLowerCase()}@guest.local`,
          // Guests never log in with a password; random value only satisfies
          // the schema and keeps credential login impossible for this account.
          password: crypto.randomBytes(32).toString('hex'),
          role: 'athlete',
          isGuest: true,
          guestDeviceId: deviceId,
        });
        await user.save();
      } catch (error: unknown) {
        // Two first launches racing on the same device: the sparse unique
        // index on guestDeviceId rejects one insert — reuse the winner.
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
          user = await User.findOne({ guestDeviceId: deviceId });
        }
        if (!user) throw error;
      }
    }

    const token = signAthleteToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isGuest: true,
    });

    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isGuest: true,
      },
    });
  } catch (error) {
    console.error('Guest login error:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd wewnętrzny serwera.' },
      { status: 500 }
    );
  }
}
