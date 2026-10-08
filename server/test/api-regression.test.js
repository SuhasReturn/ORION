import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { app } from '../src/server.js'

describe('End-to-End HTTP API & Regression Verification', () => {
  let server
  let baseUrl

  before(async () => {
    process.env.NODE_ENV = 'test'
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port
        baseUrl = `http://localhost:${port}`
        resolve()
      })
    })
  })

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('Module 0: Root endpoint responds', async () => {
    const res = await fetch(`${baseUrl}/`)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.match(json.message, /ORION backend is running/i)
  })

  test('Module 1: Health check endpoint is healthy', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.status, 'healthy')
  })

  test('Module 1: Database health check validates SQLite connection', async () => {
    const res = await fetch(`${baseUrl}/api/health/database`)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.database, 'sqlite')
    assert.equal(json.status, 'healthy')
  })

  test('Module 2: GET /api/profile returns 404 when no profile exists', async () => {
    const res = await fetch(`${baseUrl}/api/profile`)
    assert.equal(res.status, 404)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.match(json.message, /No ORION profile has been created yet/i)
  })

  test('Module 2: POST /api/profile validates missing fields', async () => {
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.ok(json.errors)
  })

  test('Module 3: GET /api/preferences returns configured=false when unconfigured', async () => {
    const res = await fetch(`${baseUrl}/api/preferences`)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.configured, false)
    assert.equal(json.preferences, null)
  })

  test('Module 3: POST /api/preferences validates input', async () => {
    const res = await fetch(`${baseUrl}/api/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desiredRoles: [] }),
    })
    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.ok(json.errors.desiredRoles)
  })

  test('Module 4: GET /api/jobs returns empty job list with pagination', async () => {
    const res = await fetch(`${baseUrl}/api/jobs`)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.ok(Array.isArray(json.jobs))
    assert.equal(json.page, 1)
    assert.equal(json.limit, 20)
  })

  test('Module 4: GET /api/jobs/discovery/status returns status structure', async () => {
    const res = await fetch(`${baseUrl}/api/jobs/discovery/status`)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
  })

  test('Module 4: POST /api/jobs/discover returns 409 configuration error without profile', async () => {
    const res = await fetch(`${baseUrl}/api/jobs/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 409)
    const json = await res.json()
    assert.equal(json.success, false)
    assert.match(json.message, /Create your candidate profile before discovering jobs/i)
  })
})
