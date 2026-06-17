# Backup and restore drill

Run this before public production and repeat quarterly.

## Supabase backup/PITR evidence

- Confirm daily backups are enabled.
- Confirm PITR is enabled for the production project.
- Screenshot backup settings and store in release evidence.

## Restore drill

1. Create or select a staging Supabase project.
2. Restore the latest production backup into staging.
3. Set staging `DATABASE_URL` and `DIRECT_URL`.
4. Run:

```powershell
pnpm.cmd --filter @travelpoint/api db:generate
pnpm.cmd --filter @travelpoint/api exec prisma migrate status --schema=prisma/schema.prisma
```

5. Start API against staging.
6. Run production smoke with staging API URL:

```powershell
$env:TRAVELPOINT_API_URL='https://staging-api.example.com'
pnpm.cmd smoke:production
```

7. Verify these data classes exist after restore:

- explorers
- spots
- circles
- journeys
- photos
- transmissions
- subscriptions
- audit logs

## Acceptance

The drill passes only if:

- restore completes without manual schema edits
- migrations report no drift
- `/health` is green
- smoke test passes
- sample user data is readable
- no production secrets were copied into staging logs or docs
