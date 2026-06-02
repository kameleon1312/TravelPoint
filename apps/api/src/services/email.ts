import { Resend } from 'resend';
import { logger } from '../lib/logger';

const resend = new Resend(process.env['RESEND_API_KEY'] ?? '');
const FROM   = process.env['EMAIL_FROM'] ?? 'TravelPoint <noreply@travelpoint.app>';
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://travelpoint.app';

// ─── Shared HTML shell ────────────────────────────────────────────────────────
function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>TravelPoint</title>
</head>
<body style="margin:0;padding:0;background:#070A0C;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070A0C;padding:40px 0;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0C1014;border-radius:16px;border:1px solid #253035;overflow:hidden;">
        <!-- Logo bar -->
        <tr>
          <td style="padding:28px 36px;border-bottom:1px solid #253035;">
            <span style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.5px;color:#EDE8DF;">
              TravelPoint
            </span>
            <span style="font-family:'Courier New',monospace;font-size:11px;color:#5A5550;margin-left:8px;letter-spacing:3px;text-transform:uppercase;">
              NETWORK
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #253035;background:#0C1014;">
            <p style="margin:0;font-size:11px;color:#5A5550;font-family:'Courier New',monospace;line-height:1.6;">
              TravelPoint — sieć dla obsesjonatów odkrywania<br>
              <a href="${APP_URL}/rodo" style="color:#5A5550;">Twoje prawa RODO</a> &nbsp;·&nbsp;
              <a href="${APP_URL}/polityka-prywatnosci" style="color:#5A5550;">Polityka prywatności</a> &nbsp;·&nbsp;
              <a href="${APP_URL}/regulamin" style="color:#5A5550;">Regulamin</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:26px;font-weight:700;color:#EDE8DF;letter-spacing:-0.5px;">${text}</h1>`;
}

function eyebrow(text: string) {
  return `<p style="margin:0 0 16px;font-family:'Courier New',monospace;font-size:11px;color:#8A827A;letter-spacing:3px;text-transform:uppercase;">${text}</p>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:14px;color:#C4B9AC;line-height:1.7;font-family:Arial,sans-serif;">${text}</p>`;
}

function cta(text: string, href: string, color = '#5CB88C') {
  return `
<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:${color};border-radius:12px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#070A0C;text-decoration:none;letter-spacing:0.3px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

function code(text: string) {
  return `<div style="margin:20px 0;padding:16px 20px;background:#131A1F;border:1px solid #253035;border-radius:10px;border-left:3px solid #5CB88C;">
    <span style="font-family:'Courier New',monospace;font-size:20px;letter-spacing:4px;color:#5CB88C;">${text}</span>
  </div>`;
}

function divider() {
  return `<hr style="margin:24px 0;border:none;border-top:1px solid #253035;" />`;
}

// ─── Send helpers ─────────────────────────────────────────────────────────────
async function send(to: string, subject: string, html: string): Promise<void> {
  if (!process.env['RESEND_API_KEY']) {
    logger.warn({ to, subject }, 'RESEND_API_KEY not set — email skipped');
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    logger.info({ to, subject }, 'Email sent');
  } catch (err) {
    logger.error({ err, to, subject }, 'Email send failed — non-fatal');
  }
}

// ─── 1. Welcome email — po rejestracji ───────────────────────────────────────
export async function sendWelcomeEmail(to: string, handle: string): Promise<void> {
  const html = wrap(`
    ${eyebrow('Witaj w sieci')}
    ${h1(`Cześć, @${handle}`)}
    ${p('Twoje konto w TravelPoint jest gotowe. Dołączyłeś do sieci eksploratorów obsesjonatów odkrywania — ukrytych miejsc, secret dropów i circles, o których nie przeczytasz w żadnym przewodniku.')}
    ${p('Pobierz aplikację mobilną CORE, żeby zacząć:')}
    ${cta('Pobierz TravelPoint CORE', APP_URL + '#app')}
    ${divider()}
    ${eyebrow('Co dalej?')}
    ${p('<strong style="color:#EDE8DF;">◉ Uzupełnij tożsamość</strong> — archetype, obsesje, terytoria. Twój profil to Twój sygnał w sieci.')}
    ${p('<strong style="color:#EDE8DF;">◈ Twój rank: NEWCOMER</strong> — zdobywaj trust points odkrywając i dropując spoty. Droga do LEGEND zaczyna się teraz.')}
    ${p('<strong style="color:#EDE8DF;">◑ Znajdź circle</strong> — zamknięte kręgi z mapami, chatami i exclusive dropami.')}
    ${divider()}
    ${p('Nie oczekuj tutoriali. Sieć mówi do tych, którzy jej szukają.')}
    ${p('<span style="color:#8A827A;font-size:12px;">Jeśli to nie Ty tworzyłeś konto, zignoruj tę wiadomość.</span>')}
  `);

  await send(to, `Witaj w sieci, @${handle} — TravelPoint`, html);
}

// ─── 2. Waitlist confirmation — po dołączeniu do listy ───────────────────────
export async function sendWaitlistConfirmationEmail(to: string): Promise<void> {
  const html = wrap(`
    ${eyebrow('Request Access')}
    ${h1('Zgłoszenie przyjęte')}
    ${p('Twój request access do TravelPoint został zarejestrowany. Działamy na zaproszenia — damy znać, gdy otworzymy kolejną falę dostępu.')}
    ${p('TravelPoint to nie kolejna aplikacja podróżnicza. To zamknięta sieć dla ludzi z obsesją odkrywania: urban explorers, backpackerów, vanlife, miejsc których nie ma na mapach.')}
    ${divider()}
    ${eyebrow('Czego oczekiwać?')}
    ${p('◉ &nbsp;Zaproszenie przyjdzie na ten adres email<br>◈ &nbsp;Będziesz potrzebować kodu invite do rejestracji<br>◎ &nbsp;Dostęp jest ograniczony celowo — jakość kręgu zależy od kogo wpuszczamy')}
    ${divider()}
    ${p('<span style="color:#8A827A;font-size:12px;">Nie chcesz już otrzymywać wiadomości? Odpowiedz na tego maila z tekstem "wypisz".</span>')}
  `);

  await send(to, 'Twój request access — TravelPoint', html);
}

// ─── 3. Invite code email — kod zaproszenia dla nowego explorera ─────────────
export async function sendInviteEmail(
  to: string,
  inviterHandle: string,
  inviteCode: string,
): Promise<void> {
  const html = wrap(`
    ${eyebrow('Zaproszenie do sieci')}
    ${h1(`@${inviterHandle} zaprasza Cię`)}
    ${p(`Explorer @${inviterHandle} uważa, że powinieneś być w TravelPoint. Dostałeś jednorazowy kod invite — ważny przez 30 dni.`)}
    ${p('Twój kod zaproszenia:')}
    ${code(inviteCode)}
    ${cta('Zarejestruj się z kodem', APP_URL + '/dolacz?invite=' + inviteCode, '#C86840')}
    ${divider()}
    ${p('TravelPoint to prywatna sieć eksploratorów: ukryte spoty, secret dropy, circles z dostępem po zaproszeniu. Nie ma tu turystów.')}
    ${p('<span style="color:#8A827A;font-size:12px;">Kod jest jednorazowy. Nie udostępniaj go publicznie.</span>')}
  `);

  await send(to, `@${inviterHandle} zaprasza Cię do TravelPoint`, html);
}

// ─── 4. Circle invite notification — powiadomienie o zaproszeniu do circle ───
export async function sendCircleInviteEmail(
  to: string,
  handle: string,
  circleName: string,
  inviteCode: string,
): Promise<void> {
  const html = wrap(`
    ${eyebrow('Circle Invite')}
    ${h1(`Jesteś zaproszony do circle`)}
    ${p(`Hej @${handle}, dostałeś zaproszenie do circle <strong style="color:#EDE8DF;">${circleName}</strong>.`)}
    ${p('Twój kod dostępu do circle:')}
    ${code(inviteCode)}
    ${p('Wejdź w aplikację, znajdź circle i użyj kodu.')}
    ${divider()}
    ${p('<span style="color:#8A827A;font-size:12px;">Kod wygasa po 7 dniach.</span>')}
  `);

  await send(to, `Zaproszenie do circle ${circleName} — TravelPoint`, html);
}
