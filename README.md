# ORION

**Opportunity & Recruitment Intelligence Operations Network** is a local-first, privacy-focused AI job-search and outreach assistant.

## Local-first architecture

ORION is designed to run on the user's computer. User data, including future local database files and generated artifacts, stays in local ignored directories and is never committed to Git. This foundation has no central cloud database or paid service dependency.

## Current technology stack

- Frontend: React and Vite
- Backend: Node.js, Express, CORS, and dotenv

## Run the frontend

```bash
cd client
npm install
npm run dev
```

Vite will print the local development URL (normally `http://localhost:5173`).

## Run the backend

```bash
cd server
npm install
npm run dev
```

The server listens on `http://localhost:5000` by default. Set `PORT` in `server/.env` to use another local port.

## Check the backend

Open these URLs in a browser or use a terminal:

```bash
curl http://localhost:5000/
curl http://localhost:5000/api/health
```

Both endpoints return JSON confirming the service is running and healthy.

## Local database

ORION uses Prisma ORM with a local SQLite database at `data/orion.db`. The complete `data/` directory is ignored by Git to keep user information local. See [the local database guide](docs/local-database.md) for initialization, migration, inspection, and health-check commands.
