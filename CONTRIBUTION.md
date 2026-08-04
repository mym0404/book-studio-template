# Contributing

## Local development

Each developer runs an independent PostgreSQL database with the same local
credentials. The same `.env.local` value points to each developer's own
machine, so database contents are not shared.

1. Install the pinned toolchain and dependencies:

   ```sh
   mise trust
   mise install
   mise exec -- pnpm install --frozen-lockfile
   ```

2. Start PostgreSQL in Docker:

   ```sh
   docker run --name book-studio-db \
     -e POSTGRES_USER=book_studio \
     -e POSTGRES_PASSWORD=book_studio \
     -e POSTGRES_DB=book_studio \
     -p 5432:5432 \
     -d postgres:17
   ```

3. Apply the schema to the fresh database:

   ```sh
   docker exec -i book-studio-db \
     psql -U book_studio -d book_studio \
     < db/migrations/001_initial.sql
   ```

4. Create `.env.local`:

   ```dotenv
   DATABASE_URL=postgresql://book_studio:book_studio@localhost:5432/book_studio
   ```

   Do not commit `.env.local`.

5. Start the development server:

   ```sh
   mise exec -- pnpm dev
   ```

On later sessions, restart the existing database with:

```sh
docker start book-studio-db
```
