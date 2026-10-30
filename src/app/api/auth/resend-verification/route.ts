import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { isInCooldown, issueEmailVerification } from '@/lib/account';

const GENERIC_RESPONSE = {
  message: 'Jeśli konto o tym adresie czeka na aktywację, wysłaliśmy nowy link aktywacyjny.',
};

// Always answers the same way so the endpoint can't be used to probe which
// e-mails are registered.
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Podaj adres e-mail.' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user && user.emailVerified === false && !isInCooldown(user.emailVerificationSentAt)) {
      await issueEmailVerification(user);
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Wystąpił błąd wewnętrzny serwera.' }, { status: 500 });
  }
}
