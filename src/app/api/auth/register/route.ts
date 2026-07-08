import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role, guestDeviceId } = await request.json();



    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Wszystkie pola są wymagane.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Hasło musi mieć co najmniej 6 znaków.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Użytkownik z tym adresem e-mail już istnieje.' },
        { status: 400 }
      );
    }

    // A guest (per-device) account registering keeps its user document — and
    // with it all data created on that device — instead of starting over.
    if (guestDeviceId && role === 'athlete') {
      const guestUser = await User.findOne({ guestDeviceId, isGuest: true });
      if (guestUser) {
        guestUser.name = name.trim();
        guestUser.email = email.toLowerCase().trim();
        guestUser.password = password; // Will be hashed by pre-save middleware
        guestUser.isGuest = false;
        // Free the device id so the device can start a fresh guest account later.
        guestUser.guestDeviceId = undefined;
        await guestUser.save();

        return NextResponse.json(
          {
            message: 'Konto zostało utworzone, a dotychczasowe dane zachowane.',
            user: {
              id: guestUser._id.toString(),
              name: guestUser.name,
              email: guestUser.email,
              role: guestUser.role,
            }
          },
          { status: 201 }
        );
      }
    }

    // Create user (password hashing is handled in the User model pre-save middleware)
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Will be hashed by pre-save middleware
      role,
    });

    await user.save();


    return NextResponse.json(
      {
        message: 'Użytkownik został utworzony pomyślnie.',
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd wewnętrzny serwera.' },
      { status: 500 }
    );
  }
}
