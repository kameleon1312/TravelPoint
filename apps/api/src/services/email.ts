import { logger } from '../lib/logger';
import { env } from '../config/env';

const RESEND_URL = 'https://api.resend.com/emails';

function getConfig() {
  return { apiKey: env.resendApiKey, from: env.emailFrom };
}

// ─── Core send — native fetch, no SDK, no React dependency ───────────────────
async function send(to: string, subject: string, html: string): Promise<void> {
  const { apiKey, from } = getConfig();

  if (!apiKey || apiKey === 're_CHANGE_ME') {
    logger.warn({ to, subject }, 'RESEND_API_KEY not set — email skipped');
    return;
  }

  try {
    const res = await fetch(RESEND_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      logger.warn({ to, subject, status: res.status, body }, 'Resend API error — non-fatal');
    } else {
      logger.info({ to, subject }, 'Email sent');
    }
  } catch (err) {
    logger.error({ err, to, subject }, 'Resend fetch failed — non-fatal');
  }
}

// ─── HTML shell ───────────────────────────────────────────────────────────────
function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"/><title>TravelPoint</title></head>
<body style="margin:0;padding:0;background:#070A0C;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070A0C;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#0C1014;border-radius:16px;border:1px solid #253035;overflow:hidden;">
      <tr>
        <td style="padding:28px 36px;border-bottom:1px solid #253035;">
          <span style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#EDE8DF;">TravelPoint</span>
          <span style="font-family:'Courier New',monospace;font-size:11px;color:#5A5550;margin-left:8px;letter-spacing:3px;text-transform:uppercase;">NETWORK</span>
        </td>
      </tr>
      <tr><td style="padding:36px 36px 28px;">${body}</td></tr>
      <tr>
        <td style="padding:20px 36px;border-top:1px solid #253035;">
          <p style="margin:0;font-size:11px;color:#5A5550;font-family:'Courier New',monospace;line-height:1.6;">
            TravelPoint — sieć dla obsesjonatów odkrywania<br/>
            <a href="https://travelpoint.app/rodo" style="color:#5A5550;">Prawa RODO</a> &nbsp;·&nbsp;
            <a href="https://travelpoint.app/polityka-prywatnosci" style="color:#5A5550;">Polityka prywatności</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const h1 = (t: string) =>
  `<h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#EDE8DF;letter-spacing:-0.5px;">${t}</h1>`;
const eyebrow = (t: string) =>
  `<p style="margin:0 0 16px;font-family:'Courier New',monospace;font-size:11px;color:#8A827A;letter-spacing:3px;text-transform:uppercase;">${t}</p>`;
const p = (t: string) =>
  `<p style="margin:0 0 16px;font-size:14px;color:#C4B9AC;line-height:1.7;">${t}</p>`;
const cta = (text: string, href: string, color = '#5CB88C') =>
  `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:${color};border-radius:12px;"><a href="${href}" style="display:inline-block;padding:14px 28px;font-size:13px;font-weight:700;color:#070A0C;text-decoration:none;">${text}</a></td></tr></table>`;
const codeBlock = (text: string) =>
  `<div style="margin:20px 0;padding:16px 20px;background:#131A1F;border:1px solid #253035;border-radius:10px;border-left:3px solid #5CB88C;"><span style="font-family:'Courier New',monospace;font-size:20px;letter-spacing:4px;color:#5CB88C;">${text}</span></div>`;
const hr = () =>
  `<hr style="margin:24px 0;border:none;border-top:1px solid #253035;"/>`;

const APP_URL = env.appUrl;

// ─── 1. Welcome ───────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, handle: string): Promise<void> {
  await send(
    to,
    `Witaj w sieci, @${handle} — TravelPoint`,
    wrap(`
      ${eyebrow('Witaj w sieci')}
      ${h1(`Cześć, @${handle}`)}
      ${p('Twoje konto w TravelPoint jest gotowe. Dołączyłeś do sieci eksploratorów obsesjonatów odkrywania — ukrytych miejsc, secret dropów i circles, o których nie przeczytasz w żadnym przewodniku.')}
      ${cta('Pobierz TravelPoint CORE', APP_URL + '#app')}
      ${hr()}
      ${eyebrow('Co dalej?')}
      ${p('<strong style="color:#EDE8DF;">◉ Uzupełnij tożsamość</strong> — archetype, obsesje, terytoria.')}
      ${p('<strong style="color:#EDE8DF;">◈ Rank: NEWCOMER</strong> — zdobywaj trust points odkrywając spoty. Droga do LEGEND zaczyna się teraz.')}
      ${p('<strong style="color:#EDE8DF;">◑ Znajdź circle</strong> — zamknięte kręgi z mapami i exclusive dropami.')}
      ${hr()}
      ${p('Nie oczekuj tutoriali. Sieć mówi do tych, którzy jej szukają.')}
    `),
  );
}

// ─── 2. Waitlist confirmation ─────────────────────────────────────────────────
export async function sendWaitlistConfirmationEmail(to: string): Promise<void> {
  await send(
    to,
    'Twój request access — TravelPoint',
    wrap(`
      ${eyebrow('Request Access')}
      ${h1('Zgłoszenie przyjęte')}
      ${p('Twój request access do TravelPoint został zarejestrowany. Działamy na zaproszenia — damy znać, gdy otworzymy kolejną falę dostępu.')}
      ${p('TravelPoint to zamknięta sieć dla ludzi z obsesją odkrywania: urban explorers, backpackerów, vanlife, miejsc których nie ma na mapach.')}
      ${hr()}
      ${eyebrow('Czego oczekiwać?')}
      ${p('◉ &nbsp;Zaproszenie przyjdzie na ten adres email<br/>◈ &nbsp;Będziesz potrzebować kodu invite<br/>◎ &nbsp;Dostęp jest ograniczony celowo')}
    `),
  );
}

// ─── 3. Invite code delivery ──────────────────────────────────────────────────
export async function sendInviteEmail(
  to: string,
  inviterHandle: string,
  inviteCode: string,
): Promise<void> {
  await send(
    to,
    `@${inviterHandle} zaprasza Cię do TravelPoint`,
    wrap(`
      ${eyebrow('Zaproszenie do sieci')}
      ${h1(`@${inviterHandle} zaprasza Cię`)}
      ${p(`Explorer @${inviterHandle} uważa, że powinieneś być w TravelPoint. Oto Twój jednorazowy kod invite — ważny przez 30 dni.`)}
      ${p('Twój kod zaproszenia:')}
      ${codeBlock(inviteCode)}
      ${cta('Zarejestruj się z kodem', APP_URL + '/dolacz?invite=' + inviteCode, '#C86840')}
      ${hr()}
      ${p('<span style="color:#8A827A;font-size:12px;">Kod jest jednorazowy. Nie udostępniaj go publicznie.</span>')}
    `),
  );
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await send(
    to,
    'Potwierdź adres e-mail - TravelPoint',
    wrap(`${eyebrow('Bezpieczeństwo konta')}${h1('Potwierdź adres e-mail')}${p('Link jest ważny przez 24 godziny.')}${cta('Potwierdź e-mail', url)}`),
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await send(
    to,
    'Reset hasła - TravelPoint',
    wrap(`${eyebrow('Bezpieczeństwo konta')}${h1('Ustaw nowe hasło')}${p('Link jest ważny przez godzinę. Jeżeli to nie Ty, zignoruj wiadomość.')}${cta('Ustaw nowe hasło', url, '#C86840')}`),
  );
}

// ─── 4. Circle invite notification ───────────────────────────────────────────
export async function sendCircleInviteEmail(
  to: string,
  handle: string,
  circleName: string,
  inviteCode: string,
): Promise<void> {
  await send(
    to,
    `Zaproszenie do circle ${circleName} — TravelPoint`,
    wrap(`
      ${eyebrow('Circle Invite')}
      ${h1('Jesteś zaproszony do circle')}
      ${p(`Hej @${handle}, dostałeś zaproszenie do circle <strong style="color:#EDE8DF;">${circleName}</strong>.`)}
      ${p('Twój kod dostępu do circle:')}
      ${codeBlock(inviteCode)}
      ${p('Wejdź w aplikację, znajdź circle i użyj kodu.')}
      ${hr()}
      ${p('<span style="color:#8A827A;font-size:12px;">Kod wygasa po 7 dniach.</span>')}
    `),
  );
}
