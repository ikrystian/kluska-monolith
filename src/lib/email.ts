import 'server-only';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    secure: process.env.SMTP_SECURE === 'true',
    // Mailpit (local dev) needs no credentials; only authenticate when configured.
    ...(process.env.SMTP_USER
        ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
        : {}),
});

export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
    text: string;
}

/** Returns false when the message could not be handed to the SMTP server. */
export const sendEmail = async ({ to, subject, html, text }: EmailMessage): Promise<boolean> => {
    if (!process.env.SMTP_HOST) {
        console.warn('SMTP_HOST not set. Email not sent.', { to, subject });
        return false;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Leniwa Kluska" <noreply@leniwakluska.pl>',
            to,
            subject,
            html,
            text,
        });
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

/** Base URL used in links inside e-mails (pages served by this Next.js app). */
export function getAppUrl(): string {
    return (process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3001').replace(/\/$/, '');
}
