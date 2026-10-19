/**
 * ORION Windows Desktop Application Entrypoint (Electron Main Process)
 * Manages window lifecycle, backend child process, and loopback IPC safely.
 */
const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')
const { fork, spawn } = require('node:child_process')
const http = require('node:http')
const fs = require('node:fs')

let mainWindow = null
let backendProcess = null
const BACKEND_PORT = process.env.PORT || 5000
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Determine persistent per-user data directory (%APPDATA%\ORION on Windows)
function getStorageDirectory() {
  const userDir = app.getPath('userData')
  const dataDir = path.join(userDir, 'data')
  const dbDir = path.join(dataDir, 'database')
  const uploadsDir = path.join(dataDir, 'uploads', 'resumes')
  const backupsDir = path.join(dataDir, 'backups')
  const secureDir = path.join(dataDir, 'secure')

  fs.mkdirSync(dbDir, { recursive: true })
  fs.mkdirSync(uploadsDir, { recursive: true })
  fs.mkdirSync(backupsDir, { recursive: true })
  fs.mkdirSync(secureDir, { recursive: true })

  return {
    userDir,
    dataDir,
    dbPath: path.join(dbDir, 'orion.db'),
  }
}

// Check if a backend server is already running on BACKEND_PORT
function isPortInUse(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(true)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(1000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

// Start backend process if not already running
async function startBackend() {
  const inUse = await isPortInUse(BACKEND_PORT)
  if (inUse) {
    console.log(`Backend is already running on port ${BACKEND_PORT}. Skipping child spawn.`)
    return
  }

  const { dataDir, dbPath } = getStorageDirectory()
  const serverPath = isDev
    ? path.join(__dirname, '..', 'server', 'src', 'server.js')
    : path.join(process.resourcesPath, 'server', 'src', 'server.js')

  const env = {
    ...process.env,
    PORT: String(BACKEND_PORT),
    DATABASE_URL: `file:${dbPath}`,
    ORION_DATA_DIR: dataDir,
    NODE_ENV: isDev ? 'development' : 'production',
  }

  console.log(`Starting ORION backend process at: ${serverPath}`)
  backendProcess = fork(serverPath, [], {
    env,
    stdio: 'pipe',
  })

  backendProcess.stdout?.on('data', (d) => console.log(`[Backend] ${d}`))
  backendProcess.stderr?.on('data', (d) => console.error(`[Backend ERR] ${d}`))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'ORION - Intelligence Operations Network',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  // Open external links (e.g. job URLs, LinkedIn) in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Load app: Vite dev URL in development, static build in production
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    const distPath = path.join(__dirname, '..', 'client', 'dist', 'index.html')
    mainWindow.loadFile(distPath)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Clean shutdown: ensure backend process is terminated
function cleanupProcesses() {
  if (backendProcess) {
    console.log('Terminating ORION backend process...')
    try {
      backendProcess.kill('SIGTERM')
    } catch {
      // ignore
    }
    backendProcess = null
  }
}

app.on('before-quit', cleanupProcesses)
app.on('will-quit', cleanupProcesses)
app.on('window-all-closed', () => {
  cleanupProcesses()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.whenReady().then(async () => {
  try {
    await startBackend()
  } catch (err) {
    console.error('Failed to start local backend:', err)
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})
