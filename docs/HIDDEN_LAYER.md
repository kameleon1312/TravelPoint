# TravelPoint — Hidden Layer System

The Hidden Layer is TravelPoint's core differentiator. It makes the map feel alive and exclusive.

## Access Levels

| `AccessLevel` | Who sees exact coords | Others see |
|---|---|---|
| `PUBLIC` | Everyone | Full coordinates |
| `TRUSTED` | Explorers with `rank >= TRUSTED` | Fuzzed pin + "unlock at higher rank" |
| `CIRCLE_ONLY` | Only circle members | Not even visible (or just a glow on map) |
| `SECRET_DROP` | One-time discovery, expires (`dropExpiresAt`) | Pulsing ember pin, disappears after time |

## Server-Side Enforcement

**NEVER enforce access control on the frontend.**

The resolver lives in `apps/api/src/services/hiddenLayer.ts`:

```typescript
resolveSpotForViewer(spot, viewer, auditFn)
// → entitled: returns full lat/lng + locked: false
// → not entitled: returns a stable fuzzed lat/lng (1500 m) + locked: true + requiredAccess
// → CIRCLE_ONLY outsider / expired SECRET_DROP: null (spot does not exist)
```

Every entitled access triggers an audit log entry.

Every other surface that exposes spot data must apply the same entitlement:
search (no story matching on locked spots), feed (TRUSTED only for TRUSTED+),
signals/push (`entitledRecipients` in `routes/spots.ts`), and subresources
(photos, comments, reactions, verifications via `requireExactSpotAccess`).

## Trust Score System

`trustScore` grows from:
- Verified spots: +15 pts
- Circle positive reactions: +3 pts
- Time in network: +2 pts/week
- Successful invite: +20 pts
- Published journey: +8 pts

### Rank thresholds

| Rank | Trust Score | Unlocks |
|---|---|---|
| NEWCOMER | 0 | Public spots only |
| EXPLORER | 50 | Basic profile features |
| TRUSTED | 150 | TRUSTED spots on map |
| INSIDER | 400 | Can generate invite codes |
| LEGEND | 1000 | All access, featured in WORLD |

## Invite System

- INSIDER+ explorers receive an invite pool
- Each invite creates a time-limited `invite/[code]` (30-day TTL)
- The invited explorer inherits the "lineage" (who invited whom)
- Lineage creates accountability + cult feeling

## Secret Drops

SECRET_DROP spots are time-limited or view-limited discoveries:
- `dropExpiresAt` — spot disappears from map after this time
- Displayed as pulsing ember pin (urgency signal)
- Only visible and accessible while `dropExpiresAt > now()`
- Can be used for: expedition reveals, circle events, hidden meetups

## Map Behavior

- PUBLIC: aurora pin, always visible
- TRUSTED (locked for viewer): fuzzed position + lock icon + blur overlay
- CIRCLE_ONLY (not member): not shown OR subtle "energy glow" without pin
- SECRET_DROP (active): pulsing ember pin with countdown
- SECRET_DROP (expired): removed from map entirely
