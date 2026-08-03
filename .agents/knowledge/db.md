# Database

This document owns PostgreSQL provider portability, connection configuration, persisted application state, schema application, and local database setup.

## Runtime Contract

- Book Studio uses PostgreSQL through the `postgres` client and reads the connection string from `DATABASE_URL`.
- The same application code supports a standard local PostgreSQL server and hosted PostgreSQL providers such as Neon.
- PostgreSQL stores reading progress, annotations, published-page state, passkey credentials, one-time WebAuthn challenges, and SHA-256 hashes of opaque sessions.
- The database client is created lazily. A build does not prove database connectivity; every database-backed runtime path requires a reachable database with the application schema.

## Schema Contract

- `db/migrations/001_initial.sql` is the complete schema for a fresh database.
- Apply it as one trusted SQL file. Do not split it on semicolons.
- Do not run it against an existing database until its current schema and ownership are confirmed. `CREATE TABLE IF NOT EXISTS` does not repair incompatible tables.
- A valid installation contains `reading_progress`, `annotations`, `public_pages`, `owner_auth`, `auth_sessions`, and `auth_challenges`.

## Local PostgreSQL

With Docker installed, start a local development database:

```sh
docker run --name book-studio-db \
  -e POSTGRES_USER=book_studio \
  -e POSTGRES_PASSWORD=book_studio \
  -e POSTGRES_DB=book_studio \
  -p 5432:5432 \
  -d postgres:17
```

Apply the schema only to this fresh database:

```sh
docker exec -i book-studio-db \
  psql -U book_studio -d book_studio \
  < db/migrations/001_initial.sql
```

Create the fixed E2E database once. The E2E command applies the migration and
resets only the authentication tables before its scenario:

```sh
docker exec book-studio-db \
  createdb -U book_studio book_studio_e2e
```

Create `.env.local` with the local connection string, then restart the development server:

```dotenv
DATABASE_URL=postgresql://book_studio:book_studio@localhost:5432/book_studio
```
