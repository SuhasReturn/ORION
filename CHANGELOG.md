# Changelog

All notable changes to the **ORION** project are documented in this file.

## [0.1.0] - 2026-10-20

### Milestone: Full Platform Release (Modules 0–21)

#### Foundation & Core Storage (Modules 0–4)
- **Module 0**: Project foundation, folder conventions, and environment configuration.
- **Module 1**: Local SQLite integration with Prisma ORM, WAL concurrency, and schema migrations.
- **Module 2**: Candidate onboarding wizard, profile persistence, and 10MB PDF resume uploads.
- **Module 3**: Candidate job preferences engine (work modes, locations, role titles, salary thresholds).
- **Module 4**: Job discovery engine with Remotive adapter, respectful rate-limiting, and error isolation.

#### Intelligent Pipeline & CRM (Modules 5–10)
- **Module 5**: Multi-field normalization (industry titles, company names, Indian city aliases, LPA/USD salary parsing) and multi-signal Jaccard deduplication.
- **Module 6**: Hard criteria filtering engine with explicit pass/fail reasons.
- **Module 7**: Deterministic 5-factor matching algorithm (skills 40%, role 25%, mode 15%, location 10%, salary 10%).
- **Module 8**: Local AI enhancement via Ollama (mistral/llama3) with deterministic offline fallbacks.
- **Module 9**: Job CRM status pipeline (`discovered` -> `saved` -> `applied` -> `interviewing` -> `offer` -> `rejected` -> `archived`).
- **Module 10**: Professional contact directory with recruiter/hiring manager taxonomy and outreach status tracking.

#### Outreach, Email & Tracking (Modules 11–15)
- **Module 11**: AI outreach message generator with multiple tones, length controls, message types, and multichannel support.
- **Module 12**: Outreach approval state machine with SHA-256 cryptographic content integrity checking.
- **Module 13**: Official Gmail API OAuth integration with narrow scope (`gmail.send`), AES-256-GCM token encryption, RFC 2822 formatting, and sending safeguards.
- **Module 14**: Follow-up scheduler with attempt counters, reminder date calculations, and status transitions.
- **Module 15**: Complete job application tracker with lifecycle event activity logging, interview schedules, and notes.

#### Operations, Security, Desktop & Release (Modules 16–21)
- **Module 16**: Unified dashboard summary API consolidating application metrics, urgent follow-ups, and top job recommendations.
- **Module 17**: Career analytics engine providing conversion funnels, response rates, top required skills, and timelines.
- **Module 18**: Local backup and restore system with SQLite copy, JSON manifest exports, integrity verification, and directory traversal safeguards.
- **Module 19**: Security and privacy hardening: explicit loopback (`127.0.0.1`) binding, strict CORS policy, payload size limits, and sanitized error middleware.
- **Module 20**: Windows desktop packaging via Electron, ensuring user data persists in `%APPDATA%\ORION` across app updates.
- **Module 21**: Release verification suite (`scripts/release-check.js`) and comprehensive automated test suite (158 passing tests across 32 suites).
