import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { MIN_PASSWORD_LENGTH, hashToken, markEmailVerified, sendPasswordChangedEmail } from '@/lib/account';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (typeof token !== 'string' || !token) {
      return NextResponse.json({ error: 'Brak tokenu resetu hasła.' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Link do resetu hasła jest nieprawidłowy, wygasł lub został już użyty.', code: 'INVALID_TOKEN' },
        { status: 400 }
      );
    }

    user.password = password; // Will be hashed by pre-save middleware
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    // Opening the reset link proves ownership of the inbox just like the
    // activation link does.
    if (user.emailVerified === false) {
      markEmailVerified(user);
    }
    await user.save();
    await sendPasswordChangedEmail(user);

    return NextResponse.json({ message: 'Hasło zostało zmienione. Możesz się teraz zalogować.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Wystąpił błąd wewnętrzny serwera.' }, { status: 500 });
  }
}
