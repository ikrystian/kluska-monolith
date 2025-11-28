import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'user',
        pass: process.env.SMTP_PASS || 'pass',
    },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    if (!process.env.SMTP_HOST) {
        console.warn('SMTP_HOST not set. Email not sent.', { to, subject });
        return;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Kluska Monolith" <noreply@example.com>',
            to,
            subject,
            html,
        });
        console.log('Email sent successfully to:', to);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};
