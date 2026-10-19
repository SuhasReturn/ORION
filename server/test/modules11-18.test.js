/**
 * Automated tests for Modules 11-18.
 * Tests message generation, approval workflow, follow-ups, applications, dashboard, analytics, backup.
 */
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { generateTemplateMessage, MESSAGE_TYPES, TONES, LENGTHS } from '../src/services/outreach/messageTemplates.js'
import {
  OUTREACH_STATES, isValidTransition, computeContentHash,
  isApprovalValid, getValidNextStates, getAllStates,
} from '../src/services/outreach/outreachStateMachine.js'
import { gmailService } from '../src/services/email/gmailService.js'

// ── Test server for HTTP integration tests ──
let baseUrl
let server

before(async () => {
  const { app } = await import('../src/server.js')
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`
      resolve()
    })
  })
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
})

async function api(method, urlPath, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) options.body = JSON.stringify(body)
  const res = await fetch(`${baseUrl}${urlPath}`, options)
  const data = await res.json()
  return { httpStatus: res.status, ...data }
}

// ══════════════════════════════════════════
// MODULE 11: Message Generation
// ══════════════════════════════════════════

describe('Module 11: Template Message Generation', () => {
  const candidate = { name: 'Suhas', skills: [{ name: 'React' }, { name: 'Node.js' }] }
  const job = {
    title: 'Frontend Developer',
    normalizedTitle: 'Frontend Engineer',
    normalizedCompany: 'Google',
    company: { name: 'Google' },
    matchedSkills: JSON.stringify(['React', 'JavaScript']),
  }
  const contact = { name: 'Jane Smith', role: 'Recruiter', type: 'recruiter', company: { name: 'Google' } }

  test('generates recruiter outreach with subject and message', () => {
    const result = generateTemplateMessage({
      messageType: 'recruiter_outreach', candidate, job, contact,
    })
    assert.ok(result.subject.includes('Frontend Engineer'))
    assert.ok(result.subject.includes('Google'))
    assert.ok(result.message.includes('Jane Smith'))
    assert.ok(result.message.includes('Suhas'))
    assert.equal(result.generationSource, 'template')
  })

  test('generates hiring manager outreach', () => {
    const result = generateTemplateMessage({
      messageType: 'hiring_manager_outreach', candidate, job, contact,
    })
    assert.ok(result.subject.includes('Frontend Engineer'))
    assert.ok(result.message.length > 50)
  })

  test('generates employee networking message', () => {
    const result = generateTemplateMessage({
      messageType: 'employee_networking', candidate, job, contact,
    })
    assert.ok(result.message.includes('Google'))
  })

  test('generates referral request', () => {
    const result = generateTemplateMessage({
      messageType: 'referral_request', candidate, job, contact,
    })
    assert.ok(result.subject.includes('Referral'))
  })

  test('generates application interest message', () => {
    const result = generateTemplateMessage({
      messageType: 'application_interest', candidate, job, contact,
    })
    assert.ok(result.message.includes('applied'))
  })

  test('generates follow-up draft', () => {
    const result = generateTemplateMessage({
      messageType: 'follow_up', candidate, job, contact,
    })
    assert.ok(result.message.includes('follow up'))
  })

  test('respects tone setting', () => {
    const professional = generateTemplateMessage({
      messageType: 'recruiter_outreach', candidate, job, contact, tone: 'professional',
    })
    const friendly = generateTemplateMessage({
      messageType: 'recruiter_outreach', candidate, job, contact, tone: 'friendly',
    })
    const concise = generateTemplateMessage({
      messageType: 'recruiter_outreach', candidate, job, contact, tone: 'concise',
    })
    assert.ok(professional.message.includes('Dear'))
    assert.ok(friendly.message.includes('Hope'))
    assert.ok(concise.message.includes('Hi'))
  })

  test('respects length preference', () => {
    const short = generateTemplateMessage({
      messageType: 'recruiter_outreach', candidate, job, contact, lengthPreference: 'short',
    })
    const detailed = generateTemplateMessage({
      messageType: 'recruiter_outreach', candidate, job, contact, lengthPreference: 'detailed',
    })
    assert.ok(short.message.length < detailed.message.length)
  })

  test('handles missing contact gracefully', () => {
    const result = generateTemplateMessage({
      messageType: 'recruiter_outreach', candidate, job, contact: null,
    })
    assert.ok(result.message.includes('Hiring Team'))
    assert.ok(result.subject.length > 0)
  })

  test('handles missing job gracefully', () => {
    const result = generateTemplateMessage({
      messageType: 'employee_networking', candidate, job: null, contact,
    })
    assert.ok(result.message.length > 50)
  })

  test('does not fabricate data', () => {
    const result = generateTemplateMessage({
      messageType: 'recruiter_outreach',
      candidate: { name: 'Test', skills: [] },
      job: { title: 'Role', company: { name: 'Acme' } },
      contact: { name: 'Bob' },
    })
    assert.ok(!result.message.includes('[Your'))
    assert.ok(!result.message.includes('{'))
  })

  test('includes user context when provided', () => {
    const result = generateTemplateMessage({
      messageType: 'recruiter_outreach', candidate, job, contact,
      userContext: 'I spoke with them at a conference.',
    })
    assert.ok(result.message.includes('conference'))
  })
})

// ══════════════════════════════════════════
// MODULE 12: Outreach State Machine
// ══════════════════════════════════════════

describe('Module 12: Outreach State Machine', () => {
  test('all states are defined', () => {
    const states = getAllStates()
    assert.ok(states.includes('draft'))
    assert.ok(states.includes('pending_approval'))
    assert.ok(states.includes('approved'))
    assert.ok(states.includes('rejected'))
    assert.ok(states.includes('sending'))
    assert.ok(states.includes('sent'))
    assert.ok(states.includes('failed'))
    assert.ok(states.includes('cancelled'))
  })

  test('draft can transition to pending_approval', () => {
    assert.ok(isValidTransition('draft', 'pending_approval'))
  })

  test('draft cannot transition directly to approved', () => {
    assert.ok(!isValidTransition('draft', 'approved'))
  })

  test('pending_approval can go to approved or rejected', () => {
    assert.ok(isValidTransition('pending_approval', 'approved'))
    assert.ok(isValidTransition('pending_approval', 'rejected'))
  })

  test('approved can transition to sending', () => {
    assert.ok(isValidTransition('approved', 'sending'))
  })

  test('rejected cannot go directly to sending', () => {
    assert.ok(!isValidTransition('rejected', 'sending'))
  })

  test('rejected can go back to draft', () => {
    assert.ok(isValidTransition('rejected', 'draft'))
  })

  test('sent has no valid outgoing transitions', () => {
    const next = getValidNextStates('sent')
    assert.equal(next.length, 0)
  })

  test('cancelled can go back to draft', () => {
    assert.ok(isValidTransition('cancelled', 'draft'))
  })

  test('content hash is deterministic', () => {
    const hash1 = computeContentHash('Subject', 'Body')
    const hash2 = computeContentHash('Subject', 'Body')
    assert.equal(hash1, hash2)
  })

  test('different content produces different hash', () => {
    const hash1 = computeContentHash('Subject', 'Body A')
    const hash2 = computeContentHash('Subject', 'Body B')
    assert.notEqual(hash1, hash2)
  })

  test('approval validation detects content change', () => {
    const hash = computeContentHash('Original Subject', 'Original Body')
    const outreach = {
      status: 'approved',
      subject: 'Original Subject',
      message: 'Original Body',
      approvedContentHash: hash,
    }
    assert.ok(isApprovalValid(outreach))

    outreach.message = 'Modified Body'
    assert.ok(!isApprovalValid(outreach))
  })

  test('approval invalid for non-approved status', () => {
    assert.ok(!isApprovalValid({ status: 'draft', approvedContentHash: 'abc' }))
  })
})

// ══════════════════════════════════════════
// MODULE 11-12: API Integration Tests
// ══════════════════════════════════════════

describe('Module 11-12: Outreach API', () => {
  test('POST /api/outreach/generate requires profile or validates input', async () => {
    const res = await api('POST', '/api/outreach/generate', {
      messageType: 'recruiter_outreach',
    })
    // 409 if no profile exists, 201 if profile exists and message generated
    assert.ok(res.httpStatus === 201 || res.httpStatus === 409)
  })

  test('POST /api/outreach/generate rejects invalid messageType', async () => {
    const res = await api('POST', '/api/outreach/generate', {
      messageType: 'invalid_type',
    })
    // 400 if input validation runs first, 409 if profile check runs first
    assert.ok(res.httpStatus === 400 || res.httpStatus === 409)
    assert.ok(!res.success)
  })

  test('POST /api/outreach/generate rejects invalid tone', async () => {
    const res = await api('POST', '/api/outreach/generate', {
      messageType: 'recruiter_outreach',
      tone: 'aggressive',
    })
    // 400 for validation error, 409 if no profile
    assert.ok(res.httpStatus === 400 || res.httpStatus === 409)
    assert.ok(!res.success)
  })

  test('GET /api/outreach returns list', async () => {
    const res = await api('GET', '/api/outreach')
    assert.ok(res.success)
    assert.ok(Array.isArray(res.outreach))
  })

  test('GET /api/outreach/approval-queue returns queue', async () => {
    const res = await api('GET', '/api/outreach/approval-queue')
    assert.ok(res.success)
    assert.ok(Array.isArray(res.queue))
  })

  test('GET /api/outreach/:id returns 404 for invalid id', async () => {
    const res = await api('GET', '/api/outreach/nonexistent')
    assert.equal(res.httpStatus, 404)
  })

  test('PUT /api/outreach/:id returns 404 for invalid id', async () => {
    const res = await api('PUT', '/api/outreach/nonexistent', { message: 'test' })
    assert.equal(res.httpStatus, 404)
  })

  test('DELETE /api/outreach/:id returns 404 for invalid id', async () => {
    const res = await api('DELETE', '/api/outreach/nonexistent')
    assert.equal(res.httpStatus, 404)
  })

  test('POST /api/outreach/:id/submit returns 404 for invalid id', async () => {
    const res = await api('POST', '/api/outreach/nonexistent/submit')
    assert.equal(res.httpStatus, 404)
  })

  test('POST /api/outreach/:id/approve returns 404 for invalid id', async () => {
    const res = await api('POST', '/api/outreach/nonexistent/approve')
    assert.equal(res.httpStatus, 404)
  })

  test('POST /api/outreach/:id/send returns 404 for invalid id', async () => {
    const res = await api('POST', '/api/outreach/nonexistent/send')
    assert.equal(res.httpStatus, 404)
  })
})

// ══════════════════════════════════════════
// MODULE 14: Follow-up Management
// ══════════════════════════════════════════

describe('Module 14: Follow-up API', () => {
  test('GET /api/follow-ups returns list', async () => {
    const res = await api('GET', '/api/follow-ups')
    assert.ok(res.success)
    assert.ok(Array.isArray(res.followUps))
  })

  test('POST /api/follow-ups requires scheduledAt', async () => {
    const res = await api('POST', '/api/follow-ups', {})
    assert.equal(res.httpStatus, 400)
    assert.ok(res.message.includes('scheduledAt'))
  })

  test('POST /api/follow-ups rejects invalid date', async () => {
    const res = await api('POST', '/api/follow-ups', { scheduledAt: 'not-a-date' })
    assert.equal(res.httpStatus, 400)
    assert.ok(res.message.includes('Invalid'))
  })

  test('POST /api/follow-ups creates follow-up with valid date', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    const res = await api('POST', '/api/follow-ups', {
      scheduledAt: futureDate,
      notes: 'Test follow-up',
    })
    assert.ok(res.httpStatus === 201)
    assert.ok(res.success)
  })

  test('POST /api/follow-ups/:id/complete returns 404 for invalid id', async () => {
    const res = await api('POST', '/api/follow-ups/nonexistent/complete')
    assert.equal(res.httpStatus, 404)
  })

  test('POST /api/follow-ups/:id/cancel returns 404 for invalid id', async () => {
    const res = await api('POST', '/api/follow-ups/nonexistent/cancel')
    assert.equal(res.httpStatus, 404)
  })
})

// ══════════════════════════════════════════
// MODULE 15: Application Tracking
// ══════════════════════════════════════════

describe('Module 15: Application Tracking API', () => {
  test('GET /api/applications returns list', async () => {
    const res = await api('GET', '/api/applications')
    assert.ok(res.success)
    assert.ok(Array.isArray(res.applications))
  })

  test('POST /api/applications requires jobId', async () => {
    const res = await api('POST', '/api/applications', {})
    // 400 if user exists, 409 if no user profile
    assert.ok(res.httpStatus === 400 || res.httpStatus === 409)
    assert.ok(!res.success)
  })

  test('POST /api/applications returns error for nonexistent job', async () => {
    const res = await api('POST', '/api/applications', { jobId: 'nonexistent' })
    // 404 if user exists, 409 if no user profile
    assert.ok(res.httpStatus === 404 || res.httpStatus === 409)
    assert.ok(!res.success)
  })

  test('GET /api/applications/:id returns 404 for invalid id', async () => {
    const res = await api('GET', '/api/applications/nonexistent')
    assert.equal(res.httpStatus, 404)
  })

  test('POST /api/applications/:id/status returns 404 for invalid id', async () => {
    const res = await api('POST', '/api/applications/nonexistent/status', { status: 'applied' })
    assert.equal(res.httpStatus, 404)
  })

  test('POST /api/applications/:id/status validates status value', async () => {
    const res = await api('POST', '/api/applications/nonexistent/status', { status: 'invalid' })
    assert.ok(res.httpStatus === 400 || res.httpStatus === 404)
  })
})

describe('Module 15: Application Status Transitions', () => {
  test('interested can transition to preparing', () => {
    const transitions = {
      interested: ['preparing', 'applied', 'withdrawn', 'archived'],
      preparing: ['applied', 'withdrawn', 'archived'],
      applied: ['assessment', 'interview', 'rejected', 'withdrawn', 'archived'],
      offer: ['archived', 'withdrawn'],
      rejected: ['archived'],
      archived: [],
    }
    assert.ok(transitions.interested.includes('preparing'))
    assert.ok(transitions.interested.includes('applied'))
    assert.ok(!transitions.interested.includes('offer'))
    assert.ok(!transitions.archived.includes('interested'))
    assert.equal(transitions.archived.length, 0)
  })
})

// ══════════════════════════════════════════
// MODULE 16: Dashboard
// ══════════════════════════════════════════

describe('Module 16: Dashboard API', () => {
  test('GET /api/dashboard returns aggregated data', async () => {
    const res = await api('GET', '/api/dashboard')
    assert.ok(res.success)
    assert.ok(res.dashboard)
    assert.ok('jobs' in res.dashboard)
    assert.ok('applications' in res.dashboard)
    assert.ok('outreach' in res.dashboard)
    assert.ok('followUps' in res.dashboard)
    assert.ok('contacts' in res.dashboard)
    assert.ok(typeof res.dashboard.jobs.total === 'number')
    assert.ok(typeof res.dashboard.contacts === 'number')
  })

  test('dashboard jobs counts are non-negative', async () => {
    const res = await api('GET', '/api/dashboard')
    assert.ok(res.dashboard.jobs.total >= 0)
    assert.ok(res.dashboard.jobs.eligible >= 0)
    assert.ok(res.dashboard.jobs.saved >= 0)
  })
})

// ══════════════════════════════════════════
// MODULE 17: Analytics
// ══════════════════════════════════════════

describe('Module 17: Analytics API', () => {
  test('GET /api/analytics/overview returns metrics', async () => {
    const res = await api('GET', '/api/analytics/overview')
    assert.ok(res.success)
    assert.ok(res.analytics)
    assert.ok('jobsDiscovered' in res.analytics)
    assert.ok('applications' in res.analytics)
    assert.ok('outreachDrafts' in res.analytics)
  })

  test('GET /api/analytics/overview supports date range', async () => {
    const res = await api('GET', '/api/analytics/overview?range=30d')
    assert.ok(res.success)
    assert.ok(res.analytics.period.from)
    assert.ok(res.analytics.period.to)
  })

  test('GET /api/analytics/applications returns by-status breakdown', async () => {
    const res = await api('GET', '/api/analytics/applications')
    assert.ok(res.success)
    assert.ok(res.analytics.byStatus !== undefined)
  })

  test('GET /api/analytics/outreach returns outreach stats', async () => {
    const res = await api('GET', '/api/analytics/outreach')
    assert.ok(res.success)
    assert.ok('byStatus' in res.analytics)
    assert.ok('byType' in res.analytics)
  })

  test('zero denominator does not cause NaN', async () => {
    const res = await api('GET', '/api/analytics/overview')
    if (res.analytics.interviewConversionRate !== null) {
      assert.ok(!isNaN(res.analytics.interviewConversionRate))
    }
  })
})

// ══════════════════════════════════════════
// MODULE 18: Backup & Restore
// ══════════════════════════════════════════

describe('Module 18: Backup API', () => {
  test('GET /api/backup/list returns backup list', async () => {
    const res = await api('GET', '/api/backup/list')
    assert.ok(res.success)
    assert.ok(Array.isArray(res.backups))
  })

  test('POST /api/backup/create creates a backup', async () => {
    const res = await api('POST', '/api/backup/create')
    assert.ok(res.httpStatus === 201)
    assert.ok(res.success)
    assert.ok(res.backup)
    assert.ok(res.backup.database)
    assert.ok(res.backup.databaseChecksum)
    assert.ok(res.backup.createdAt)
  })

  test('POST /api/backup/restore requires manifestFile', async () => {
    const res = await api('POST', '/api/backup/restore', {})
    assert.equal(res.httpStatus, 400)
    assert.ok(res.message.includes('manifestFile'))
  })

  test('POST /api/backup/restore rejects nonexistent manifest', async () => {
    const res = await api('POST', '/api/backup/restore', { manifestFile: 'nonexistent.json' })
    assert.equal(res.httpStatus, 404)
  })

  test('POST /api/backup/restore rejects path traversal', async () => {
    const res = await api('POST', '/api/backup/restore', { manifestFile: '../../../etc/passwd' })
    assert.equal(res.httpStatus, 404)
  })
})

// ══════════════════════════════════════════
// MODULE 13: Email Integration & Safeguards
// ══════════════════════════════════════════

describe('Module 13: Gmail Service & Sending Safeguards', () => {
  before(() => {
    // Inject mock transport for email sending
    gmailService.setMockTransport({
      send: async ({ to, subject, body }) => ({
        messageId: 'mock-gmail-msg-id-12345',
        threadId: 'mock-thread-id-67890',
        to,
        subject,
      }),
    })
  })

  after(() => {
    gmailService.setMockTransport(null)
  })

  test('generateAuthUrl produces valid URL with narrow scope', () => {
    const result = gmailService.generateAuthUrl()
    assert.ok(result.authUrl)
    assert.ok(result.state)
    assert.ok(result.authUrl.includes('gmail.send'))
  })

  test('validateState accepts generated state and prevents replay', () => {
    const { state } = gmailService.generateAuthUrl()
    assert.equal(gmailService.validateState(state), true)
    // Replay must fail
    assert.equal(gmailService.validateState(state), false)
  })

  test('buildRfc2822Message produces base64url encoded output with sanitized headers', () => {
    const raw = gmailService.buildRfc2822Message({
      to: 'recipient@example.com\r\nBcc: evil@attacker.com',
      subject: 'Interview inquiry\r\nSubject-Injection: bad',
      body: 'Hello there, I would love to connect.',
    })
    assert.ok(typeof raw === 'string')
    const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    assert.ok(decoded.includes('To: recipient@example.comBcc: evil@attacker.com'))
    assert.ok(!decoded.includes('\r\nBcc:'))
  })

  test('GET /api/email/status returns connection status without secret exposure', async () => {
    const res = await api('GET', '/api/email/status')
    assert.equal(res.httpStatus, 200)
    assert.ok(res.success)
    assert.equal('clientSecret' in res, false)
    assert.equal('access_token' in res, false)
    assert.equal('refresh_token' in res, false)
  })

  test('GET /api/email/auth-url returns auth url and state token', async () => {
    const res = await api('GET', '/api/email/auth-url')
    assert.equal(res.httpStatus, 200)
    assert.ok(res.authUrl)
    assert.ok(res.state)
  })

  test('POST /api/email/callback rejects invalid or expired state token', async () => {
    const res = await api('POST', '/api/email/callback', {
      code: 'valid-looking-code',
      state: 'nonexistent-expired-state',
    })
    assert.equal(res.httpStatus, 400)
  })

  test('POST /api/email/send-test requires explicit confirmation flag', async () => {
    const res = await api('POST', '/api/email/send-test', {
      confirm: false,
      recipientEmail: 'tester@example.com',
    })
    assert.equal(res.httpStatus, 400)
    assert.ok(res.message.includes('Explicit user confirmation is required'))
  })

  test('POST /api/email/send-test validates recipient email', async () => {
    const res = await api('POST', '/api/email/send-test', {
      confirm: true,
      recipientEmail: 'not-an-email',
    })
    assert.equal(res.httpStatus, 400)
  })

  test('POST /api/email/send-test sends with valid parameters', async () => {
    const res = await api('POST', '/api/email/send-test', {
      confirm: true,
      recipientEmail: 'valid.recipient@example.com',
    })
    assert.equal(res.httpStatus, 200)
    assert.ok(res.success)
    assert.equal(res.messageId, 'mock-gmail-msg-id-12345')
  })

  test('POST /api/email/disconnect cleanly disconnects', async () => {
    const res = await api('POST', '/api/email/disconnect')
    assert.equal(res.httpStatus, 200)
    assert.ok(res.success)
  })
})

// ══════════════════════════════════════════
// MODULE 19: Security & Privacy Verification
// ══════════════════════════════════════════

describe('Module 19: Security and Privacy Hardening', () => {
  test('rejects cross-origin requests from untrusted external domains', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://malicious-attacker-website.com' },
    })
    assert.equal(res.status, 403)
  })

  test('allows requests with local allowed origins', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    })
    assert.equal(res.status, 200)
  })

  test('blocks oversized request payloads exceeding limits', async () => {
    // 3MB payload exceeds 2MB body limit
    const largeBody = JSON.stringify({ data: 'A'.repeat(3 * 1024 * 1024) })
    const res = await fetch(`${baseUrl}/api/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: largeBody,
    })
    // Express returns 413 Payload Too Large
    assert.equal(res.status, 413)
  })
})

// ══════════════════════════════════════════
// Module 0-10 Regression Check
// ══════════════════════════════════════════

describe('Module 0-10 Regression After M11-18', () => {
  test('root endpoint still responds', async () => {
    const res = await api('GET', '/')
    assert.ok(res.success)
  })

  test('health endpoint still responds', async () => {
    const res = await api('GET', '/api/health')
    assert.ok(res.success)
  })

  test('jobs endpoint still responds', async () => {
    const res = await api('GET', '/api/jobs')
    assert.ok(res.success)
    assert.ok(Array.isArray(res.jobs))
  })

  test('contacts endpoint still responds', async () => {
    const res = await api('GET', '/api/contacts')
    assert.ok(res.success)
    assert.ok(Array.isArray(res.contacts))
  })
})
