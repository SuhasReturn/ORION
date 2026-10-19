# ORION Security and Privacy Architecture & Hardening Guide

## 1. Executive Summary

ORION (Opportunity & Recruitment Intelligence Operations Network) is engineered from the ground up as a **strict local-first, privacy-preserving application**. Unlike traditional SaaS career management tools, candidate profiles, resumes, job CRM states, contact directories, and AI prompts are retained entirely on the user's local workstation.

This document outlines the security architecture, threat model, applied hardenings, and residual operational risks implemented as part of Module 19.

---

## 2. Threat Model & Scope

### Operational Environment
- **Platform**: Local Windows workstation (single-user desktop installation).
- **Backend**: Node.js HTTP server.
- **Frontend**: Single-page application served locally (Vite dev server / static production build / Electron wrapper).
- **Database**: Local SQLite stored at `D:\ORION\data\database\orion.db`.
- **AI Processing**: Local Ollama daemon running on `http://127.0.0.1:11434`.

### Primary Threats & Mitigations

| Threat | Attack Vector | Mitigation in ORION |
|---|---|---|
| **Malicious Web Page Access** | Cross-Site Scripting or drive-by site attempting to call `http://localhost:5000` | Strict loopback binding (`127.0.0.1`), strict CORS origin validation (only allowing Vite dev and local origins), blocking untrusted origins with HTTP 403. |
| **Network Snooping / Exposure** | Binding to `0.0.0.0` exposing APIs to local LAN / coffee shop Wi-Fi | Explicit server binding to loopback (`127.0.0.1`) only. API is inaccessible from other devices on the LAN. |
| **Path Traversal Attacks** | Manipulating filename parameters (e.g. `../../etc/passwd` or `..\..\Windows`) in backup or upload paths | Sanitized paths using `path.basename()` and strict resolution checks preventing directory escape. Rejects invalid paths with HTTP 404/400. |
| **Credential / Token Leakage** | Storing OAuth access or refresh tokens in plaintext or logs | Tokens encrypted on disk using AES-256-GCM with PBKDF2/scrypt key derivation. Status APIs scrub tokens. Zero tokens printed in stdout/stderr logs. |
| **Malicious File Uploads** | Uploading executable files (`.exe`, `.bat`, `.js`, etc.) disguised as resumes | Strict MIME and file extension validation (PDF only). 10 MB payload ceiling. Server generates non-predictable UUID filenames (`[uuid].pdf`) in isolated directory. |
| **Denial of Service / Memory Exhaustion** | Flooding backend with gigabyte JSON payloads | Enforced Express body size limit of 2 MB for JSON bodies and 10 MB for multipart resume uploads. |

---

## 3. Data Protection & Encryption

### In-Transit Security
- Local IPC / loopback communication occurs over `127.0.0.1`.
- Outgoing communication to external services (Remotive job discovery, Google OAuth, Gmail API) strictly utilizes TLS 1.3 / HTTPS.

### At-Rest Storage
- **Database**: The SQLite database file (`data/database/orion.db`) is stored in standard SQLite format without native database encryption. Storage confidentiality relies on OS-level protections (Windows BitLocker full-disk encryption and NTFS user directory access control lists).
- **Sensitive Credentials**: Google OAuth credentials and tokens are stored in `data/secure/gmail_tokens.enc`, encrypted with AES-256-GCM.
- **Uploaded Resumes**: Resumes are placed in `data/uploads/resumes/` with random UUID filenames. They are not served through static web directories.

---

## 4. API Hardening & Input Validation

1. **Validation**: All incoming API requests validate expected data types, string bounds, and allowed enum values (e.g., job statuses, message types, tone preferences, length constraints).
2. **Database Integrity**: Relational constraints and foreign-key cascades are enforced by Prisma.
3. **Error Redaction**: Internal database stack traces and low-level filesystem paths are caught by global Express error middleware and withheld from API clients.

---

## 5. Third-Party Integrations

### Local AI (Ollama)
- Communicates exclusively with `http://127.0.0.1:11434`.
- Zero user data, resumes, or prompts are transmitted to cloud AI providers.
- Operates with offline fallbacks if the local daemon is uninstalled or stopped.

### Gmail API
- Narrowest practical scope requested: `https://www.googleapis.com/auth/gmail.send`.
- No access to incoming mailbox, user emails, or contacts list.
- Sending requires explicit, unedited, human approval of the message content verified via cryptographic SHA-256 content hashing.

---

## 6. Residual Risks & Recommendations

1. **Workstation Physical Security**: Because SQLite is stored locally, any process executing under the user's OS profile can read the database file. Enabling **BitLocker** is recommended for hardware-level security.
2. **Environment Secrets**: Never commit `.env` or client secret files to Git. The `.gitignore` has been pre-configured to exclude all `.env*` files, database files, upload directories, and backup archives.
