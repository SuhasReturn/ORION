# ORION Windows Desktop Packaging Guide (Module 20)

## 1. Overview

ORION is architected as a local-first application combining a React + Vite frontend and a Node.js + Express backend powered by SQLite and Prisma. For standalone desktop distribution on Windows, ORION packages using **Electron**.

This architecture retains 100% of the web capabilities, privacy properties, and local database guarantees while delivering a native Windows `.exe` installer.

---

## 2. Directory & Persistent Storage Architecture

A critical requirement of ORION is that **application binaries and persistent user data are strictly decoupled**:
- Application binaries reside in `Program Files\ORION` (managed by NSIS installer).
- User data resides in `%APPDATA%\ORION\data` (e.g. `C:\Users\<User>\AppData\Roaming\ORION\data`).

### Directory Layout

```
%APPDATA%\ORION\
└── data\
    ├── database\
    │   └── orion.db          <-- SQLite database (persists across app updates)
    ├── uploads\
    │   └── resumes\          <-- Stored candidate PDF resumes
    ├── backups\              <-- Local JSON & SQLite backup archives
    └── secure\
        └── gmail_tokens.enc  <-- AES-256 encrypted OAuth credentials
```

> **Important**: Reinstalling or updating ORION will **never** overwrite or wipe `%APPDATA%\ORION`. The user's database and career history remain completely intact.

---

## 3. Desktop Process Architecture & Lifecycle

```
┌────────────────────────────────────────────────────────┐
│                   Electron Main Process                │
│                   (`electron/main.cjs`)                │
└───────────────┬────────────────────────┬───────────────┘
                │ Spawns & monitors      │ Creates & manages
                ▼                        ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│     Node.js Backend       │  │      BrowserWindow      │
│  (`server/src/server.js`) │  │   (`client/dist/...`)   │
│   Listening on 127.0.0.1  │  │  Strict contextIsolation│
└───────────────────────────┘  └─────────────────────────┘
```

### Key Behaviors
1. **Duplicate Backend Prevention**: Before spawning a backend child process, the Electron main process probes `http://127.0.0.1:5000/api/health`. If an existing instance is active, it attaches to it rather than launching a duplicate.
2. **Clean Shutdown**: When all windows are closed or `before-quit` fires, the main process cleanly sends `SIGTERM` to the backend child process, preventing dangling background node processes.
3. **Controlled Navigation**: All outbound links (job posting URLs, LinkedIn profiles) are intercepted via `setWindowOpenHandler` and launched in the user's default system web browser.
4. **Renderer Isolation**: `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true` are enforced. Only safe metadata is exposed via `electron/preload.cjs`.

---

## 4. Development Workflow

To run the desktop application in development mode:

1. **Terminal 1** (Backend):
   ```powershell
   npm run dev:server
   ```
2. **Terminal 2** (Frontend):
   ```powershell
   npm run dev:client
   ```
3. **Terminal 3** (Electron Desktop Shell):
   ```powershell
   npm run desktop:dev
   ```

---

## 5. Production Packaging Workflow

To generate a Windows installer (`.exe`):

1. **Build the production frontend bundle**:
   ```powershell
   npm run build:client
   ```
2. **Compile the Windows package**:
   ```powershell
   npm run desktop:build
   ```
3. The resulting standalone installer will be placed in `dist-desktop/ORION Setup 0.1.0.exe`.

---

## 6. Verification & Automated Tests

The desktop packaging architecture has been verified for:
- Separation of user data from application executable directory
- Safe loopback network communication between renderer and server
- Secure sandbox and preload script configuration
- Zero secrets bundled in the frontend distribution
