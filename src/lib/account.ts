import 'server-only';
import crypto from 'crypto';
import type { IUser } from '@/models/User';
import { getAppUrl, sendEmail } from '@/lib/email';
import { passwordChangedEmail, passwordResetEmail, verificationEmail, welcomeEmail } from '@/lib/email-templates';

/** Bump when the terms change materially; stored on the user at registration. */
export const TERMS_VERSION = '2026-10-30';
export const MIN_PASSWORD_LENGTH = 6;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VERIFICATION_TTL_HOURS = 24;
const RESET_TTL_MINUTES = 60;
const RESEND_COOLDOWN_MS = 60_000;

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

export function isInCooldown(sentAt?: Date): boolean {
  return Boolean(sentAt) && Date.now() - sentAt!.getTime() < RESEND_COOLDOWN_MS;
}

/** Saves the user (also inserts a new one) and sends the activation link. */
export async function issueEmailVerification(user: IUser): Promise<boolean> {
  const { token, hash } = createToken();
  user.emailVerified = false;
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
  user.emailVerificationSentAt = new Date();
  await user.save();

  return sendEmail(
    verificationEmail({
      to: user.email,
      name: user.name,
      url: `${getAppUrl()}/verify-email?token=${token}`,
      expiresInHours: VERIFICATION_TTL_HOURS,
    })
  );
}

/**
 * Activates the account. A guest that registered stays a guest (keeping its
 * device binding) until this point, so the device never loses access while
 * the e-mail is unconfirmed.
 */
export function markEmailVerified(user: IUser) {
  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  if (user.isGuest) {
    user.isGuest = false;
    user.guestDeviceId = undefined;
  }
}

export async function sendWelcomeEmail(user: IUser): Promise<boolean> {
  return sendEmail(welcomeEmail({ to: user.email, name: user.name, loginUrl: `${getAppUrl()}/login` }));
}

export async function issuePasswordReset(user: IUser): Promise<boolean> {
  const { token, hash } = createToken();
  user.passwordResetTokenHash = hash;
  user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
  user.passwordResetSentAt = new Date();
  await user.save();

  return sendEmail(
    passwordResetEmail({
      to: user.email,
      name: user.name,
      url: `${getAppUrl()}/reset-password?token=${token}`,
      expiresInMinutes: RESET_TTL_MINUTES,
    })
  );
}

export async function sendPasswordChangedEmail(user: IUser): Promise<boolean> {
  return sendEmail(passwordChangedEmail({ to: user.email, name: user.name, resetUrl: `${getAppUrl()}/forgot-password` }));
}

/** Guest placeholders (`guest-…@guest.local`) have no real inbox to write to. */
export function hasRealInbox(user: IUser): boolean {
  return !user.isGuest || user.emailVerified === false;
}
