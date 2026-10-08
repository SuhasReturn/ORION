# Job Discovery Engine

Module 4 implements the **Job Discovery Engine** for ORION, fetching relevant opportunities from permitted public job sources based on the local candidate's job preferences.

All discovered jobs and company records are persisted directly to the local SQLite database (`data/orion.db`). No central cloud database, external tracking, or paid API keys are used.

---

## Architecture

The engine decouples source adapters from database persistence and service orchestration:

```
Candidate Profile + Job Preferences
                 │
                 ▼
       Discovery Service
                 │
                 ├── JobSourceAdapter (Base Interface)
                 │         │
                 │         └── RemotiveSourceAdapter (Public API)
                 │
                 ▼
          Common Raw Job
                 │
                 ▼
      Prisma Transaction
                 │
                 ├── Company (Find or Create)
                 └── Job (Upsert with source + externalId)
                 │
                 ▼
           Local SQLite
```

### Source Adapter Interface (`adapter.js`)

All source adapters inherit from `JobSourceAdapter` and implement:

- `name`: Unique source identifier string (e.g. `'remotive'`)
- `discoverJobs(preferences, options)`: Returns an array of common raw job objects

### Common Raw Job Format

Adapters return raw listings matching this structure:

| Field | Type | Description |
|---|---|---|
| `source` | `string` | Identifier of the source (e.g. `remotive`) |
| `externalId` | `string` | Unique identifier from the source provider |
| `title` | `string` | Opportunity job title |
| `companyName` | `string` | Employing company name |
| `location` | `string?` | Geographic or remote requirement |
| `workMode` | `string?` | `remote`, `hybrid`, or `on-site` |
| `employmentType` | `string?` | `full-time`, `part-time`, `contract`, etc. |
| `description` | `string?` | Full job posting description |
| `url` | `string` | Direct link to original posting |
| `salaryText` | `string?` | Raw salary text if provided by source |
| `postedAt` | `Date?` | Original publication timestamp |
| `discoveredAt` | `Date` | Timestamp when ORION discovered the listing |

---

## Permitted Sources & Responsible Access

### Remotive Public API

- **Endpoint:** `https://remotive.com/api/remote-jobs`
- **Authentication:** None required (free public API)
- **Rate Limit & Fair Use:** Remotive guidelines request a maximum rate of 2 requests per minute.
- **Configurable Throttle:** Controlled via `REMOTIVE_MIN_INTERVAL_MS` in `server/.env` (default: `60000` ms).
- **Graceful Error Handling:** If queried within the throttle window, the adapter reports the remaining wait time without crashing discovery.

---

## Duplicate Protection & Persistence

- The `Job` model enforces uniqueness on `@@unique([source, externalId])`.
- When re-running discovery, existing jobs with the same source and external ID are updated with any updated metadata, while preserving the original `discoveredAt` timestamp and any user status changes.
- Company entities are identified and linked via `name` uniqueness.

---

## Local API Endpoints

### 1. `POST /api/jobs/discover`

Initiates discovery across enabled source adapters for the local user.

- **Preconditions:** Requires existing `CandidateProfile` and `JobPreference`. Returns `409 Conflict` if either is unconfigured.
- **Payload (Optional):**
  ```json
  {
    "force": false
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "completedAt": "2026-10-09T00:15:00.000Z",
    "sources": {
      "remotive": {
        "status": "success",
        "discovered": 19,
        "stored": 19,
        "created": 19,
        "updated": 0,
        "skipped": 0
      }
    },
    "totalDiscovered": 19,
    "totalStored": 19
  }
  ```

### 2. `GET /api/jobs`

Returns paginated discovered jobs sorted by `discoveredAt DESC`.

- **Query Parameters:**
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `20`, max: `100`)
- **Response:**
  ```json
  {
    "success": true,
    "jobs": [ ... ],
    "total": 19,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

### 3. `GET /api/jobs/discovery/status`

Returns summary of the most recent discovery run or `null` if discovery has not yet executed.

---

## User Interface

The React frontend includes:

- **Discover Jobs action:** Triggers discovery with loading states and user-friendly error banners.
- **Interactive Job Cards:** Displays job title, company, location, badges for source, work mode, employment type, salary, formatted dates, and expandable descriptions.
- **View Job link:** Opens the original posting URL in a new browser tab (`target="_blank" rel="noopener noreferrer"`).
- **Pagination controls:** Navigates multiple pages of discovered jobs.
- **Ethics Guarantee:** ORION strictly avoids automatic applications or automated recruiter messaging.
