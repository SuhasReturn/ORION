# ORION Modules 5–10: Integrated Pipeline & CRM Architecture

## Overview

Modules 5–10 form the core intelligent pipeline and opportunity lifecycle management in ORION:

```
RAW JOB
  │
  ▼ (Module 5)
NORMALIZED JOB (Title, Company, Location, Work Mode, Salary, Skills)
  │
  ▼ (Module 5)
DEDUPLICATED JOB (Multi-signal similarity, URL/externalId blocking, canonical linking)
  │
  ▼ (Module 6)
FILTERED JOB (Hard criteria matching vs Candidate Job Preferences)
  │
  ▼ (Module 7)
MATCHED & RANKED JOB (Multi-factor scoring breakdown 0-100)
  │
  ▼ (Module 8)
LOCAL AI ENHANCEMENT (Ollama offline-first analysis with deterministic fallback)
  │
  ▼ (Module 9)
JOB CRM & PIPELINE (Discovered -> Applied -> Interviewing -> Offer -> Rejected)
  │
  ▼ (Module 10)
CONTACT MANAGEMENT (Recruiters, Hiring Managers, Referrals with Outreach Tracker)
```

---

## 1. Module 5 — Job Normalization & Deduplication
- **Title Normalization** (`titleNormalizer.js`): Maps colloquial and variant titles to canonical industry titles (`frontend_engineer`, `fullstack_engineer`, `backend_engineer`, etc.) preserving seniority levels (`junior`, `mid`, `senior`, `lead`, `principal`).
- **Company Normalization** (`companyNormalizer.js`): Strips legal suffixes (Pvt Ltd, LLC, Inc, Corp, etc.) while preserving uppercase acronyms (TCS, IBM, AWS).
- **Location & Work Mode** (`locationNormalizer.js`, `workModeNormalizer.js`): Standardizes Indian cities/aliases (Bangalore/Bengaluru, Bombay/Mumbai, Gurgaon/Gurugram), remote flags, and work modes (`Remote`, `Hybrid`, `On-site`, `Unknown`).
- **Salary Parser** (`salaryParser.js`): Extracts numeric min/max and currency from LPA (`₹6 LPA`, `6-10 LPA`), USD k-notation (`$80k-$100k`), and standard numeric ranges.
- **Skill Normalization** (`skillNormalizer.js`): Extracts and canonicalizes tech skills (`React.js` -> `React`, `JS` -> `JavaScript`, etc.).
- **Deduplication Engine** (`deduplicationService.js`): Multi-signal composite scoring (title, company, description Jaccard, date proximity, exact URL/externalId match) with canonical job linking.

## 2. Module 6 — Job Filtering & Preference Engine
- **Service** (`filterService.js`): Evaluates normalized jobs against candidate preferences.
- Filters out non-matching work modes, locations (respecting `openToRelocation`), and minimum salary thresholds.
- Records explicit pass/fail reasons for transparency in the candidate dashboard.

## 3. Module 7 — Matching & Ranking Algorithm
- **Service** (`matchingService.js`): Deterministic scoring engine generating an overall 0–100 match score.
- **Scoring Dimensions**:
  - Skill overlap (40% weight): Matched vs missing skills.
  - Role alignment (25% weight): Canonical title match.
  - Work mode match (15% weight).
  - Location match (10% weight).
  - Salary expectation match (10% weight).
- Produces clear match tiers (`Top Match`, `Strong Match`, `Good Match`, `Potential Match`, `Low Match`) and detailed match reasons.

## 4. Module 8 — Local AI Enhancement (Ollama Offline-First)
- **Services** (`ollamaService.js`, `aiService.js`):
  - Local AI generation using Ollama (default model: `mistral` / `llama3`).
  - Summarizes job opportunities and generates custom cover note / outreach hooks.
  - **Zero cloud dependencies & zero paid APIs**: Runs 100% locally on user machine.
  - **Graceful degradation**: Deterministic rule-based summaries and explainability when Ollama is offline or unavailable.

## 5. Module 9 — Job CRM & Opportunity Pipeline
- Full status lifecycle: `discovered` -> `saved` -> `applied` -> `interviewing` -> `offer` -> `rejected` -> `archived`.
- Tracking dates: `appliedAt`, `interviewAt`, `responseAt`.
- User notes and custom tracking data for every opportunity.

## 6. Module 10 — Contact Management & Networking
- Contact classification: `recruiter`, `hiring_manager`, `employee`, `founder`, `other`.
- Association with companies and specific job opportunities.
- Outreach status tracking (`not_contacted`, `reached_out`, `connected`, `referred`, `no_reply`).
- Notes, email, LinkedIn, and interaction history.

---

## Verification
- **Backend Tests**: 80 automated unit, integration, and regression tests passing (`npm test` in `server/`).
- **Frontend Build**: Vite production build succeeded (`npm run build` in `client/`).
- **Complete Pipeline Verified**: All endpoints and UI components operational.
