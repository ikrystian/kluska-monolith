import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { hasRealInbox, isInCooldown, issuePasswordReset } from '@/lib/account';

const GENERIC_RESPONSE = {
  message: 'Jeśli konto o tym adresie istnieje, wysłaliśmy na nie link do zresetowania hasła.',
};

// Same answer whether or not the account exists, to avoid account enumeration.
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Podaj adres e-mail.' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user && hasRealInbox(user) && !isInCooldown(user.passwordResetSentAt)) {
      await issuePasswordReset(user);
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Wystąpił błąd wewnętrzny serwera.' }, { status: 500 });
  }
}
