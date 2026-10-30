import type { EmailMessage } from '@/lib/email';

const BRAND = 'Leniwa Kluska';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface LayoutOptions {
  preheader: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footnote?: string;
}

function renderLayout({ preheader, heading, paragraphs, cta, footnote }: LayoutOptions): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3f3f46;">${p}</p>`)
    .join('');

  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
        <tr><td style="border-radius:14px;background:#f97316;">
          <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;">${escapeHtml(cta.label)}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#71717a;">Jeśli przycisk nie działa, skopiuj ten link do przeglądarki:<br>
        <a href="${escapeHtml(cta.url)}" style="color:#f97316;word-break:break-all;">${escapeHtml(cta.url)}</a>
      </p>`
    : '';

  const note = footnote
    ? `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e4e4e7;font-size:13px;line-height:1.6;color:#71717a;">${footnote}</p>`
    : '';

  return `<!doctype html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 0 16px;font-size:18px;font-weight:800;letter-spacing:0.02em;color:#18181b;">#leniwakluska</td></tr>
        <tr><td style="background:#ffffff;border-radius:20px;padding:32px;">
          <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#18181b;">${escapeHtml(heading)}</h1>
          ${body}
          ${button}
          ${note}
        </td></tr>
        <tr><td style="padding:16px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa;text-align:center;">
          © ${new Date().getFullYear()} ${BRAND}. Ta wiadomość została wysłana automatycznie — nie odpowiadaj na nią.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText(lines: string[]): string {
  return [...lines, '', `— Zespół ${BRAND}`].join('\n');
}

export function verificationEmail(params: { to: string; name: string; url: string; expiresInHours: number }): EmailMessage {
  const name = escapeHtml(params.name);
  return {
    to: params.to,
    subject: 'Potwierdź swój adres e-mail — Leniwa Kluska',
    html: renderLayout({
      preheader: 'Kliknij link, aby aktywować konto.',
      heading: 'Aktywuj swoje konto',
      paragraphs: [
        `Cześć ${name}!`,
        'Dziękujemy za rejestrację w #leniwakluska. Aby dokończyć zakładanie konta i móc się zalogować, potwierdź swój adres e-mail.',
      ],
      cta: { label: 'Aktywuj konto', url: params.url },
      footnote: `Link jest ważny przez ${params.expiresInHours} godz. Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość — bez potwierdzenia konto nie zostanie aktywowane.`,
    }),
    text: renderText([
      `Cześć ${params.name}!`,
      '',
      'Dziękujemy za rejestrację w #leniwakluska. Aby aktywować konto, otwórz poniższy link:',
      params.url,
      '',
      `Link jest ważny przez ${params.expiresInHours} godz. Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.`,
    ]),
  };
}

export function welcomeEmail(params: { to: string; name: string; loginUrl: string }): EmailMessage {
  const name = escapeHtml(params.name);
  return {
    to: params.to,
    subject: 'Konto aktywne — witaj w Leniwej Klusce!',
    html: renderLayout({
      preheader: 'Twoje konto zostało aktywowane.',
      heading: 'Konto aktywowane 🎉',
      paragraphs: [
        `Cześć ${name}!`,
        'Twój adres e-mail został potwierdzony, a konto jest gotowe. Możesz się już zalogować i zaplanować pierwszy trening.',
      ],
      cta: { label: 'Zaloguj się', url: params.loginUrl },
    }),
    text: renderText([
      `Cześć ${params.name}!`,
      '',
      'Twój adres e-mail został potwierdzony, a konto jest gotowe. Zaloguj się:',
      params.loginUrl,
    ]),
  };
}

export function passwordResetEmail(params: { to: string; name: string; url: string; expiresInMinutes: number }): EmailMessage {
  const name = escapeHtml(params.name);
  return {
    to: params.to,
    subject: 'Reset hasła — Leniwa Kluska',
    html: renderLayout({
      preheader: 'Ustaw nowe hasło do swojego konta.',
      heading: 'Zresetuj hasło',
      paragraphs: [
        `Cześć ${name}!`,
        'Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Kliknij poniższy przycisk, aby ustawić nowe hasło.',
      ],
      cta: { label: 'Ustaw nowe hasło', url: params.url },
      footnote: `Link jest ważny przez ${params.expiresInMinutes} minut i można go użyć tylko raz. Jeśli to nie Ty prosiłeś o reset, zignoruj tę wiadomość — Twoje hasło pozostanie bez zmian.`,
    }),
    text: renderText([
      `Cześć ${params.name}!`,
      '',
      'Otrzymaliśmy prośbę o zresetowanie hasła. Aby ustawić nowe hasło, otwórz link:',
      params.url,
      '',
      `Link jest ważny przez ${params.expiresInMinutes} minut. Jeśli to nie Ty prosiłeś o reset, zignoruj tę wiadomość.`,
    ]),
  };
}

export function passwordChangedEmail(params: { to: string; name: string; resetUrl: string }): EmailMessage {
  const name = escapeHtml(params.name);
  return {
    to: params.to,
    subject: 'Hasło zostało zmienione — Leniwa Kluska',
    html: renderLayout({
      preheader: 'Hasło do Twojego konta zostało zmienione.',
      heading: 'Hasło zostało zmienione',
      paragraphs: [
        `Cześć ${name}!`,
        'Informujemy, że hasło do Twojego konta zostało właśnie zmienione.',
        'Jeśli to Ty — nie musisz nic robić. Jeśli nie zmieniałeś hasła, natychmiast je zresetuj.',
      ],
      cta: { label: 'Zresetuj hasło', url: params.resetUrl },
    }),
    text: renderText([
      `Cześć ${params.name}!`,
      '',
      'Hasło do Twojego konta zostało zmienione. Jeśli to nie Ty, natychmiast zresetuj hasło:',
      params.resetUrl,
    ]),
  };
}
