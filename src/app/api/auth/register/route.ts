import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { EMAIL_RE, MIN_PASSWORD_LENGTH, TERMS_VERSION, issueEmailVerification } from '@/lib/account';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role, guestDeviceId, acceptTerms } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Wszystkie pola są wymagane.' },
        { status: 400 }
      );
    }

    if (acceptTerms !== true) {
      return NextResponse.json(
        { error: 'Musisz zaakceptować regulamin, aby założyć konto.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (!EMAIL_RE.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Podaj poprawny adres e-mail.' },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // A guest (per-device) account registering keeps its user document — and
    // with it all data created on that device — instead of starting over.
    const guestUser = guestDeviceId && role === 'athlete'
      ? await User.findOne({ guestDeviceId, isGuest: true })
      : null;

    const existingUser = await User.findOne({ email: normalizedEmail });
    // The guest re-submitting its own pending e-mail (e.g. after a typo in the
    // password) is not a conflict.
    if (existingUser && existingUser._id.toString() !== guestUser?._id.toString()) {
      return NextResponse.json(
        { error: 'Użytkownik z tym adresem e-mail już istnieje.' },
        { status: 400 }
      );
    }

    const user = guestUser ?? new User({ role });
    user.name = name.trim();
    user.email = normalizedEmail;
    user.password = password; // Will be hashed by pre-save middleware
    user.termsAcceptedAt = new Date();
    user.termsVersion = TERMS_VERSION;

    const emailSent = await issueEmailVerification(user);

    return NextResponse.json(
      {
        message: emailSent
          ? 'Konto zostało utworzone. Sprawdź skrzynkę e-mail i kliknij link aktywacyjny.'
          : 'Konto zostało utworzone, ale nie udało się wysłać e-maila aktywacyjnego. Spróbuj wysłać go ponownie.',
        requiresVerification: true,
        emailSent,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
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
