# ORION

**Opportunity & Recruitment Intelligence Operations Network**  
*A privacy-first, local workstation career intelligence, application CRM, and outreach orchestration system.*

[![Tests](https://img.shields.io/badge/tests-158%20passed-brightgreen.svg)]()
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Cross--platform-blue.svg)]()
[![Privacy](https://img.shields.io/badge/privacy-100%25%20local--first-success.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-informational.svg)]()

---

## 1. Overview & Vision

ORION is engineered from the ground up as a **strict local-first, privacy-preserving application**. Unlike traditional SaaS career management platforms, your candidate profile, uploaded resumes, job CRM states, contact directories, outreach drafts, and AI prompts are retained entirely on your local computer.

There is zero third-party telemetry, zero vendor cloud database, and zero required paid API subscriptions.

---

## 2. Core Modules & Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │               Candidate Setup                │
                    │   Module 2: Profile  │  Module 3: Preferences│
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   JOB INTELLIGENCE PIPELINE                            │
│                                                                                        │
│  Module 4: Job Discovery (Permitted public sources, Remotive API, rate-limiting)       │
│    │                                                                                   │
│    ▼                                                                                   │
│  Module 5: Normalization & Deduplication (Title, company, salary, skills, jaccard)     │
│    │                                                                                   │
│    ▼                                                                                   │
│  Module 6: Job Filtering (Hard criteria matching vs candidate preferences)             │
│    │                                                                                   │
│    ▼                                                                                   │
│  Module 7: Matching & Ranking Algorithm (Deterministic 0-100 composite score)          │
│    │                                                                                   │
│    ▼                                                                                   │
│  Module 8: Local AI Enhancement (Ollama offline-first: mistral / llama3)               │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              RELATIONSHIP & OUTREACH ENGINE                            │
│                                                                                        │
│  Module 9: Job CRM (discovered → saved → applied → interviewing → offer → rejected)   │
│  Module 10: Contact Directory (Recruiters, hiring managers, company linking)          │
│  Module 11: Outreach Generator (Templates, tones, lengths, multichannel)               │
│  Module 12: Outreach Approval State Machine (SHA-256 content verification)             │
│  Module 13: Email Integration (Gmail OAuth, narrow scope, sending safeguards)          │
│  Module 14: Follow-up Engine (Automated reminder schedules, attempt counters)          │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ANALYTICS, STORAGE & DISTRIBUTION                         │
│                                                                                        │
│  Module 15: Full Application Tracking (Detailed interview logs, notes, activities)     │
│  Module 16: Unified Dashboard (Action items, upcoming follow-ups, pipeline metrics)    │
│  Module 17: Career Analytics (Conversion funnels, top skills, timeline charts)         │
│  Module 18: Backup & Restore (Consistent SQLite snapshot, JSON export, checksums)      │
│  Module 19: Security Hardening (Loopback 127.0.0.1 binding, CORS, AES token crypto)    │
│  Module 20: Windows Desktop Packaging (Electron shell, persistent %APPDATA% storage)   │
│  Module 21: Release & Verification (`scripts/release-check.js`, 158 automated tests)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, Vanilla CSS design system.
- **Backend**: Node.js (ES Modules), Express 5.
- **Database**: SQLite (WAL mode enabled for ACID concurrency).
- **ORM**: Prisma Client.
- **Local AI**: Ollama HTTP API (`127.0.0.1:11434`) with deterministic rule-based fallback.
- **Email**: Gmail REST API (RFC 2822 base64url composition with AES-256-GCM token storage).
- **Desktop**: Electron with context isolation, process sandbox, and child process lifecycle management.

---

## 4. Quick Start (Development)

### Prerequisites
- **Node.js**: Version 20.0.0 or higher (Node 22 recommended).
- **Git**

### Installation

1. Clone repository:
   ```powershell
   git clone https://github.com/your-username/ORION.git
   cd ORION
   ```

2. Install all dependencies across client and server:
   ```powershell
   npm run install:all
   ```

3. Initialize local database:
   ```powershell
   cd server
   npx prisma migrate dev
   cd ..
   ```

4. Start development services:
   - **Backend**:
     ```powershell
     npm run dev:server
     ```
     Server listens on `http://127.0.0.1:5000`.
   - **Frontend**:
     ```powershell
     npm run dev:client
     ```
     Vite UI serves on `http://localhost:5173`.

---

## 5. Optional Integrations

### Local AI (Ollama)
ORION connects to an Ollama instance running locally for intelligent job summarization and outreach hook generation:
1. Install [Ollama](https://ollama.com/).
2. Pull your preferred local model:
   ```powershell
   ollama pull mistral
   ```
3. Start the Ollama daemon (`ollama serve`). ORION auto-detects Ollama at `http://127.0.0.1:11434`.
> *Note: If Ollama is offline or unavailable, ORION operates seamlessly using deterministic, rule-based matching and summarization fallbacks.*

### Gmail Integration
1. Configure `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` in `server/.env`.
2. Connect your account via the Settings / Email panel using official OAuth.
3. Tokens are encrypted locally using AES-256-GCM in `data/secure/gmail_tokens.enc`.
> *Note: Outreach messages can always be copied manually to your clipboard for sending via LinkedIn, WhatsApp, or any other email provider.*

---

## 6. Running Tests & Quality Verification

Run the comprehensive automated test suite (158 unit, integration, and security tests):

```powershell
npm test
```

Run the complete release verification script:

```powershell
node scripts/release-check.js
```

---

## 7. Windows Desktop Packaging

To build the standalone Windows application:

```powershell
npm run build:client
npm run desktop:build
```

The output installer (`ORION Setup 0.1.0.exe`) will be generated in `dist-desktop/`. User databases and uploaded resumes are stored in `%APPDATA%\ORION\data`, safely decoupled from the installer binary.

See [docs/desktop-packaging.md](docs/desktop-packaging.md) for architecture details.

---

## 8. Documentation Sitemap

- [Modules 5–10 Integrated Pipeline](docs/modules-5-10.md)
- [Local Database & Prisma Guide](docs/local-database.md)
- [Job Discovery Architecture](docs/job-discovery.md)
- [Job Preferences Specification](docs/job-preferences.md)
- [Security & Privacy Architecture](docs/security-privacy.md)
- [Desktop Packaging Guide](docs/desktop-packaging.md)
- [Installation Guide](docs/installation.md)
- [Changelog](CHANGELOG.md)

---

## 9. License

Private / Local Workstation License. All rights reserved.
