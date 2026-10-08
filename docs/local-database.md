# Local database

ORION stores its SQLite database only on the local machine at `data/orion.db`. The database URL is defined in `server/.env` and resolves from `server/prisma/schema.prisma` to that location. The root `.gitignore` excludes the complete `data/` directory, so the database and future user data are not committed.

## Prisma schema

The schema is at `server/prisma/schema.prisma`. It defines the local user profile, preferences, skills, companies, jobs, contacts, applications, outreach, and follow-up records.

## Initialize or update the database

From the repository root, install the backend packages and generate the Prisma client:

```powershell
npm install --prefix server
npm run prisma:generate --prefix server
```

For a normal Prisma migration workflow, create a named migration after changing the schema:

```powershell
npm run prisma:migrate --prefix server -- --name describe-your-change
```

## Inspect the database

Start Prisma Studio for a local browser interface:

```powershell
npm run prisma:studio --prefix server
```

You can also open `data/orion.db` with an SQLite-compatible desktop viewer. Do not move the file outside the ignored `data/` directory.

## Test connectivity

Start the backend, then request the database health endpoint:

```powershell
npm run dev --prefix server
Invoke-RestMethod http://localhost:5000/api/health/database
```

A successful response identifies the database as `sqlite` and confirms the local connection is healthy.
