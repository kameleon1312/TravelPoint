import { NextRequest, NextResponse } from 'next/server';
import { InviteRequestSchema } from '@travelpoint/validation';
import { Resend } from 'resend';

const FROM   = process.env['EMAIL_FROM'] ?? 'TravelPoint <onboarding@resend.dev>';

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = InviteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, handle } = parsed.data;
  const adminEmail = process.env['ADMIN_EMAIL'];

  const apiKey = process.env['RESEND_API_KEY'];
  if (apiKey) {
    const resend = new Resend(apiKey);
    await Promise.allSettled([
      // ── 1. Potwierdzenie do osoby która się zgłosiła ───────────────────────
      resend.emails.send({
        from: FROM,
        to: email,
        subject: 'Twój request access — TravelPoint',
        html: waitlistHtml(email),
      }),
      // ── 2. Powiadomienie dla admina o nowym zgłoszeniu ─────────────────────
      ...(adminEmail ? [resend.emails.send({
        from: FROM,
        to: adminEmail,
        subject: `[TravelPoint] Nowe zgłoszenie: ${email}`,
        html: adminNotificationHtml(email, handle ?? null),
      })] : []),
    ]);
  }

  // ── 2. Forward do API ENGINE (dla zapisu w DB) — fire-and-forget ──────────
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
  fetch(`${apiUrl}/api/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  }).catch(() => { /* API offline — email już wysłany, DB zapis opcjonalny */ });

  return NextResponse.json({ message: 'Request received' }, { status: 201 });
}

// ── Admin notification template ───────────────────────────────────────────────
function adminNotificationHtml(email: string, handle: string | null): string {
  const now = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8" /><title>Nowe zgłoszenie</title></head>
<body style="margin:0;padding:0;background:#070A0C;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070A0C;padding:32px 0;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#0C1014;border-radius:14px;border:1px solid #253035;overflow:hidden;">
      <tr>
        <td style="padding:20px 28px;border-bottom:1px solid #253035;background:#131A1F;">
          <span style="font-size:13px;font-weight:700;color:#EDE8DF;">TravelPoint</span>
          <span style="font-size:11px;color:#5A5550;margin-left:8px;letter-spacing:2px;text-transform:uppercase;">ADMIN</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 4px;font-size:11px;color:#8A827A;letter-spacing:3px;text-transform:uppercase;font-family:'Courier New',monospace;">Nowe zgłoszenie</p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#5CB88C;">◎ Request Access</h1>
          <table cellpadding="0" cellspacing="0" style="width:100%;background:#131A1F;border-radius:10px;border:1px solid #253035;">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #253035;">
                <span style="font-size:11px;color:#8A827A;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;">Email</span><br/>
                <span style="font-size:15px;color:#EDE8DF;font-weight:600;">${email}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #253035;">
                <span style="font-size:11px;color:#8A827A;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;">Handle</span><br/>
                <span style="font-size:15px;color:#EDE8DF;">${handle ? '@' + handle : '—'}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;">
                <span style="font-size:11px;color:#8A827A;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;">Data</span><br/>
                <span style="font-size:13px;color:#C4B9AC;">${now}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Waitlist confirmation template ────────────────────────────────────────────
function waitlistHtml(email: string): string {
  void email;
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8" /><title>TravelPoint</title></head>
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
      <tr>
        <td style="padding:36px 36px 28px;">
          <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:11px;color:#8A827A;letter-spacing:3px;text-transform:uppercase;">Request Access</p>
          <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#EDE8DF;letter-spacing:-0.5px;">Zgłoszenie przyjęte</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#C4B9AC;line-height:1.7;">
            Twój request access do TravelPoint został zarejestrowany. Działamy na zaproszenia — damy znać, gdy otworzymy kolejną falę dostępu.
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#C4B9AC;line-height:1.7;">
            TravelPoint to nie kolejna aplikacja podróżnicza. To zamknięta sieć dla ludzi z obsesją odkrywania: urban explorers, backpackerów, vanlife, miejsc których nie ma na mapach.
          </p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #253035;" />
          <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:11px;color:#8A827A;letter-spacing:3px;text-transform:uppercase;">Czego oczekiwać?</p>
          <p style="margin:0 0 8px;font-size:14px;color:#C4B9AC;line-height:1.7;">◉ &nbsp;Zaproszenie przyjdzie na ten adres email</p>
          <p style="margin:0 0 8px;font-size:14px;color:#C4B9AC;line-height:1.7;">◈ &nbsp;Będziesz potrzebować kodu invite do rejestracji</p>
          <p style="margin:0 0 16px;font-size:14px;color:#C4B9AC;line-height:1.7;">◎ &nbsp;Dostęp jest ograniczony celowo — jakość kręgu zależy od kogo wpuszczamy</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 36px;border-top:1px solid #253035;">
          <p style="margin:0;font-size:11px;color:#5A5550;font-family:'Courier New',monospace;line-height:1.6;">
            TravelPoint — sieć dla obsesjonatów odkrywania<br/>
            <a href="https://travelpoint.app/rodo" style="color:#5A5550;">Twoje prawa RODO</a> &nbsp;·&nbsp;
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
