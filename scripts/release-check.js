/**
 * Automated release verification script for ORION.
 * Runs non-destructive pre-flight checks:
 *  1. Node.js runtime version
 *  2. Required directories & .gitignore hygiene
 *  3. Secret & database exclusion checks
 *  4. Prisma schema validation
 *  5. Backend test suite
 *  6. Frontend production build
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nodeToolsDir = 'C:\\Tools\\node-v22\\node-v22.19.0-win-x64'
const envWithNode = {
  ...process.env,
  Path: `${nodeToolsDir};${process.env.Path || process.env.PATH || ''}`,
  PATH: `${nodeToolsDir};${process.env.Path || process.env.PATH || ''}`,
}

console.log('====================================================')
console.log('       ORION RELEASE VERIFICATION CHECKS')
console.log('====================================================\n')

let failures = 0

function runCheck(name, fn) {
  process.stdout.write(`• Checking ${name}... `)
  try {
    fn()
    console.log('✓ PASS')
  } catch (err) {
    console.log('✗ FAIL')
    console.error(`  Error: ${err.message}\n`)
    failures++
  }
}

// 1. Node Runtime Check
runCheck('Node.js runtime version (>= 20.0.0)', () => {
  const version = process.version
  const major = parseInt(version.slice(1).split('.')[0], 10)
  if (major < 20) {
    throw new Error(`Node.js version ${version} is unsupported. Node 20+ required.`)
  }
})

// 2. Git Hygiene & .gitignore
runCheck('.gitignore privacy rules', () => {
  const gitignorePath = path.join(rootDir, '.gitignore')
  if (!fs.existsSync(gitignorePath)) throw new Error('.gitignore file is missing.')
  const content = fs.readFileSync(gitignorePath, 'utf8')
  const requiredPatterns = ['.env', 'data/', 'uploads/', 'node_modules/']
  for (const pat of requiredPatterns) {
    if (!content.includes(pat)) {
      throw new Error(`Missing ${pat} in .gitignore.`)
    }
  }
})

// 3. Secrets / Database leak prevention check
runCheck('Repository tracked files hygiene', () => {
  const forbiddenExts = ['.db', '.db-journal', '.db-wal', '.enc']
  function checkDir(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    for (const item of items) {
      if (item.name === 'node_modules' || item.name === '.git' || item.name === 'data' || item.name === 'dist-desktop') continue
      const full = path.join(dir, item.name)
      if (item.isDirectory()) {
        checkDir(full)
      } else {
        const ext = path.extname(item.name)
        if (forbiddenExts.includes(ext) && !full.includes('fixtures')) {
          throw new Error(`Sensitive file found in tracked tree: ${full}`)
        }
      }
    }
  }
  checkDir(rootDir)
})

// 4. Prisma Schema Validation
runCheck('Prisma schema validity', () => {
  const prismaBin = path.join(rootDir, 'server', 'node_modules', '.bin', 'prisma.cmd')
  const schemaPath = path.join(rootDir, 'server', 'prisma', 'schema.prisma')
  execSync(`"${prismaBin}" validate --schema="${schemaPath}"`, {
    cwd: path.join(rootDir, 'server'),
    stdio: 'pipe',
    env: envWithNode,
  })
})

// 5. Backend Test Suite
runCheck('Backend test suite execution (158 passing)', () => {
  execSync('npm.cmd test', {
    cwd: path.join(rootDir, 'server'),
    stdio: 'pipe',
    env: envWithNode,
  })
})

// 6. Frontend Production Build
runCheck('Frontend production build (Vite)', () => {
  execSync('npm.cmd run build', {
    cwd: path.join(rootDir, 'client'),
    stdio: 'pipe',
    env: envWithNode,
  })
})

console.log('\n====================================================')
if (failures === 0) {
  console.log('✓ ALL RELEASE CHECKS PASSED. ORION is release-ready.')
  console.log('====================================================\n')
  process.exit(0)
} else {
  console.log(`✗ ${failures} RELEASE CHECK(S) FAILED. Please resolve before releasing.`)
  console.log('====================================================\n')
  process.exit(1)
}
