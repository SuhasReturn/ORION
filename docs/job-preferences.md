# Job Preferences

Module 3 stores one local job-preference profile per ORION user. Preference data remains in the SQLite database and is used only by later local modules.

## Stored data

- Work mode, employment type, experience level, minimum salary, and relocation preference
- Normalized desired roles, locations, and industries
- Required and preferred skill associations using the shared `Skill` table

Each user has at most one `JobPreference`. Related values use unique join constraints to prevent duplicate entries.

## Local API

- `GET /api/preferences` returns `{ configured: false }` until preferences exist.
- `POST /api/preferences` creates preferences after candidate onboarding.
- `PUT /api/preferences` transactionally replaces the preference values.

The React dashboard reads these endpoints and opens the local preferences form. Module 4 can consume the stored roles, locations, modes, skills, and constraints as job-discovery inputs; no job discovery is implemented here.
