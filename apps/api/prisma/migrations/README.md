# Migrations

Stosujemy ręczne migracje SQL (Prisma native engine nie działa przez Docker WSL2 na Windows).

## Jak zastosować migrację

```bash
# Skopiuj plik SQL do kontenera i wykonaj
docker exec -i tp-postgres psql -U postgres -d travelpoint < apps/api/prisma/migrations/001_add_territories.sql
```

## Historia

| Plik | Opis |
|---|---|
| `001_add_territories.sql` | Dodaje pole `territories TEXT[]` do tabeli Explorer |
