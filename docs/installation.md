# ORION Installation & Setup Guide

This guide details how to reproduce a clean installation of **ORION** on a Windows workstation.

---

## 1. Prerequisites

- **Operating System**: Windows 10 / Windows 11 (or macOS / Linux for headless server mode).
- **Node.js**: Version 20.0.0 or higher.
- **Git**
- **Hardware Requirements**:
  - Minimum: 4 GB RAM, 2 GB available disk space.
  - Recommended for local Ollama AI: 16 GB RAM with dedicated GPU or Apple Silicon.

---

## 2. Step-by-Step Installation

### Step 1: Clone Repository
```powershell
git clone https://github.com/your-username/ORION.git
cd ORION
```

### Step 2: Install Dependencies
Install dependencies for both client and server:
```powershell
npm run install:all
```

### Step 3: Configure Environment Variables
Copy and verify the environment template:
```powershell
# Server environment
Copy-Item server/.env.example server/.env -ErrorAction SilentlyContinue
```

Default `server/.env` parameters:
```env
PORT=5000
DATABASE_URL="file:../../data/orion.db"
REMOTIVE_MIN_INTERVAL_MS=60000
```

### Step 4: Run Database Migrations
Initialize the local SQLite schema and generate Prisma Client:
```powershell
cd server
npx prisma migrate dev --name init
cd ..
```

### Step 5: Run Verification Checks
Ensure your environment is healthy and all 158 tests pass:
```powershell
node scripts/release-check.js
```

---

## 3. Starting the Application

### Development Mode (Web Browser)
Open two terminal windows:
```powershell
# Terminal 1: Backend API (Listening on http://127.0.0.1:5000)
npm run dev:server

# Terminal 2: Frontend Client (Listening on http://localhost:5173)
npm run dev:client
```

### Desktop Mode (Electron Window)
```powershell
npm run desktop:dev
```

---

## 4. First-Run Onboarding Walkthrough

1. Open `http://localhost:5173` in your browser (or use the desktop app).
2. Complete the **Candidate Onboarding Wizard**:
   - Provide your contact info and education background.
   - Upload your existing resume (PDF format, up to 10 MB).
3. Set your **Job Preferences**:
   - Desired role titles (e.g. *Frontend Developer*, *Software Engineer*).
   - Preferred locations (e.g. *Bengaluru*, *Remote*).
   - Work mode preference (*Remote*, *Hybrid*, *On-site*, or *Any*).
   - Minimum salary expectation (in LPA or USD).
4. Navigate to the **Jobs Pipeline** tab and click **Discover Jobs** to fetch and rank live opportunities.
5. Review AI match breakdowns, track applications, and generate customized outreach messages!

---

## 5. Troubleshooting & FAQ

### Database Locked / SQLite Concurrency
ORION configures SQLite in WAL (Write-Ahead Logging) mode with automatic busy timeouts. If you encounter lock warnings during manual database inspection, close external SQLite viewers (like DB Browser for SQLite) or use Prisma Studio:
```powershell
cd server
npx prisma studio
```

### Ollama Not Detected
If ORION displays `Ollama Offline` on the dashboard:
1. Ensure Ollama is installed and running (`ollama serve`).
2. Verify you have downloaded a supported model (`ollama pull mistral`).
3. Test locally in PowerShell: `curl http://127.0.0.1:11434/api/tags`.
4. ORION will continue to function normally using deterministic fallbacks even if Ollama is not installed.
