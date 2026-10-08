import { JobSourceAdapter, validateRawJob } from '../adapter.js'

const SOURCE_NAME = 'remotive'
const ENDPOINT = 'https://remotive.com/api/remote-jobs'

let lastRequestAt = 0

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function resetRemotiveThrottle() {
  lastRequestAt = 0
}

export function getLastRequestAt() {
  return lastRequestAt
}

export function mapRemotiveJob(job) {
  const url = text(job?.url)
  const externalId = job?.id === undefined || job?.id === null ? url : String(job.id)
  const title = text(job?.title)

  if (!title || !url || !externalId) return null

  const rawJob = {
    source: SOURCE_NAME,
    externalId,
    title,
    companyName: text(job?.company_name) ?? 'Unknown company',
    location: text(job?.candidate_required_location),
    workMode: 'remote',
    employmentType: text(job?.job_type),
    description: text(job?.description),
    url,
    salaryText: text(job?.salary),
    postedAt: job?.publication_date ? new Date(job.publication_date) : null,
    discoveredAt: new Date(),
  }

  return validateRawJob(rawJob) ? rawJob : null
}

export class RemotiveSourceAdapter extends JobSourceAdapter {
  constructor() {
    super(SOURCE_NAME)
  }

  async discoverJobs(preferences, { fetchImpl = fetch, limit = 20, bypassInterval = false } = {}) {
    const configuredInterval = Number(process.env.REMOTIVE_MIN_INTERVAL_MS)
    const minIntervalMs = Number.isFinite(configuredInterval) && configuredInterval >= 0
      ? configuredInterval
      : 60_000

    const now = Date.now()
    if (!bypassInterval && (now - lastRequestAt < minIntervalMs)) {
      const waitSec = Math.max(1, Math.ceil((minIntervalMs - (now - lastRequestAt)) / 1000))
      throw new Error(`Remotive was queried recently. Please wait ${waitSec}s before discovering again.`)
    }

    const query = preferences?.roles?.[0]?.value ||
      (Array.isArray(preferences?.desiredRoles) ? preferences.desiredRoles[0] : null)

    if (!query) {
      throw new Error('No desired role is configured to query Remotive.')
    }

    const url = new URL(ENDPOINT)
    url.searchParams.set('search', query)
    url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 20)))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    try {
      lastRequestAt = now
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Remotive returned HTTP ${response.status}.`)
      }

      const payload = await response.json()
      if (!Array.isArray(payload?.jobs)) {
        throw new Error('Remotive returned an unexpected response structure.')
      }

      return payload.jobs.map(mapRemotiveJob).filter(Boolean)
    } finally {
      clearTimeout(timeout)
    }
  }
}

export const remotiveSource = new RemotiveSourceAdapter()
