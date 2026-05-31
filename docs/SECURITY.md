# TravelPoint — Security & Privacy

## Threat Model

TravelPoint exposes where people travel and (optionally) live.
A location data breach can cause **physical harm**. This is the highest-risk data category.

### Primary threats
1. Precise location of a traveler exposed without consent
2. Home base / vanlife base disclosed publicly
3. Hidden spot coordinates exposed to unauthorized clients
4. Session token theft
5. Account takeover via credential stuffing

## Authentication

### Password hashing
- **Argon2id** with `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`
- Never: bcrypt default rounds, MD5, SHA-1

### Tokens
- Access token: JWT HS256, 15 minutes
- Refresh token: JWT HS256, 7 days, stored hashed in DB
- Rotation on each refresh use (revoke old → issue new)
- Secrets ≥256-bit from `openssl rand -base64 32`

### Mobile token storage
- **expo-secure-store** (Keychain on iOS, Keystore on Android)
- Never: AsyncStorage, localStorage

## Geo Privacy — CRITICAL

> Location data can physically endanger a traveler. Treat it like explosives.

### Hard rules

| Rule | Implementation |
|---|---|
| Location default OFF | `locationConsent = false` at account creation |
| Live Presence opt-in | Requires explicit activation, expires on session end |
| Public coord fuzzing | ≥500m jitter, random seed per session |
| Hidden spot coords | Returned only to entitled clients (server-side check) |
| Home base | AES-256-GCM encrypted at rest, never exposed publicly |
| GPS trail retention | Raw GPS deleted/aggregated after 90 days unless saved |

### Fuzzing algorithm
`packages/geo/src/fuzz.ts` — Mulberry32 PRNG with per-session seed.
Fuzz radius: 500m for public presence, 1500m for locked spots.

## Hidden Layer Security

- Access control is **server-side only** (`apps/api/src/services/hiddenLayer.ts`)
- Frontend **never receives** exact coordinates of a locked spot
- Every entitled access is **audit-logged** (who, when, which spot)

## Transport Security
- TLS 1.3 only, HSTS `max-age=31536000; includeSubDomains; preload`
- CORS strict whitelist
- Rate limiting: 100 req/min global, 5 req/15min on auth endpoints

## Data at Rest Encryption
AES-256-GCM (application-level) for: phone numbers, home base coordinates,
private journey notes, hidden spot exact coordinates.

## RODO / GDPR Compliance

| Requirement | Implementation |
|---|---|
| Explicit consent | Checkbox: terms + privacy at registration |
| Geo consent separate | Separate consent for location, presence, journey tracking |
| Right to erasure | `DELETE /api/explorers/me` — soft delete, purge in 30d |
| Data portability | `GET /api/explorers/me/export` — full JSON |
| Geo retention | Raw GPS deleted after 90d if not saved to journey |
| Audit log | Every access to hidden spots logged |

## Logging Redaction

Pino logger with redaction of:
- `req.headers.authorization`
- `req.body.password`
- `*.email`, `*.phone`
- `*.lat`, `*.lng`, `*.locationLat`, `*.locationLng`

**Coordinates are NEVER written to logs.**

## Incident Response

1. Geo data leak: immediately rotate ENCRYPTION_KEY, notify affected explorers, RODO breach report within 72h
2. Token compromise: mass-revoke refresh tokens for affected accounts
3. API abuse: block IP at CDN level, review rate limits
