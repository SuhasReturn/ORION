import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../src/lib/prisma.js'
import { JobSourceAdapter, validateRawJob } from '../src/services/job-discovery/adapter.js'
import {
  RemotiveSourceAdapter,
  mapRemotiveJob,
  resetRemotiveThrottle,
} from '../src/services/job-discovery/sources/remotiveSource.js'
import {
  DiscoveryConfigurationError,
  discoverJobsForLocalUser,
  persistRawJob,
  listDiscoveredJobs,
  getDiscoveryStatus,
} from '../src/services/job-discovery/discoveryService.js'

describe('Module 4: Job Source Architecture & Adapter Interface', () => {
  test('JobSourceAdapter requires non-empty name', () => {
    assert.throws(() => new JobSourceAdapter(''), /requires a non-empty name string/)
    assert.throws(() => new JobSourceAdapter(null), /requires a non-empty name string/)

    const adapter = new JobSourceAdapter('custom-source')
    assert.equal(adapter.name, 'custom-source')
  })

  test('JobSourceAdapter discoverJobs throws if unimplemented', async () => {
    const adapter = new JobSourceAdapter('test')
    await assert.rejects(
      async () => adapter.discoverJobs({}),
      /discoverJobs must be implemented by adapter test/
    )
  })

  test('validateRawJob enforces required fields', () => {
    assert.equal(validateRawJob(null), false)
    assert.equal(validateRawJob({}), false)
    assert.equal(validateRawJob({ source: 'remotive' }), false)
    assert.equal(validateRawJob({ source: 'remotive', externalId: '123' }), false)
    assert.equal(validateRawJob({ source: 'remotive', externalId: '123', title: 'Eng' }), false)
    assert.equal(
      validateRawJob({
        source: 'remotive',
        externalId: '123',
        title: 'Engineer',
        url: 'https://example.com/job',
      }),
      true
    )
  })
})

describe('Module 4: Remotive Source Adapter', () => {
  test('mapRemotiveJob maps valid payload accurately', () => {
    const raw = {
      id: 98765,
      url: 'https://remotive.com/job/98765',
      title: 'Full Stack Engineer',
      company_name: 'Acme Corp',
      candidate_required_location: 'Worldwide',
      job_type: 'full-time',
      salary: '$100k - $120k',
      publication_date: '2026-10-01T12:00:00Z',
      description: '<p>Great job opening</p>',
    }

    const mapped = mapRemotiveJob(raw)
    assert.ok(mapped)
    assert.equal(mapped.source, 'remotive')
    assert.equal(mapped.externalId, '98765')
    assert.equal(mapped.title, 'Full Stack Engineer')
    assert.equal(mapped.companyName, 'Acme Corp')
    assert.equal(mapped.location, 'Worldwide')
    assert.equal(mapped.workMode, 'remote')
    assert.equal(mapped.employmentType, 'full-time')
    assert.equal(mapped.salaryText, '$100k - $120k')
    assert.equal(mapped.url, 'https://remotive.com/job/98765')
    assert.equal(mapped.postedAt?.toISOString(), '2026-10-01T12:00:00.000Z')
    assert.ok(mapped.discoveredAt instanceof Date)
  })

  test('mapRemotiveJob rejects payloads missing title or url', () => {
    assert.equal(mapRemotiveJob({ id: 1, title: 'No URL' }), null)
    assert.equal(mapRemotiveJob({ id: 2, url: 'https://example.com' }), null)
  })

  test('RemotiveSourceAdapter handles successful response', async () => {
    const adapter = new RemotiveSourceAdapter()
    resetRemotiveThrottle()

    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        jobs: [
          {
            id: 101,
            url: 'https://remotive.com/101',
            title: 'Frontend Developer',
            company_name: 'Tech Co',
          },
        ],
      }),
    })

    const jobs = await adapter.discoverJobs(
      { roles: [{ value: 'Frontend Developer' }] },
      { fetchImpl: mockFetch, bypassInterval: true }
    )

    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].externalId, '101')
    assert.equal(jobs[0].title, 'Frontend Developer')
  })

  test('RemotiveSourceAdapter handles empty jobs list', async () => {
    const adapter = new RemotiveSourceAdapter()
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({ jobs: [] }),
    })

    const jobs = await adapter.discoverJobs(
      { roles: [{ value: 'Niche Role' }] },
      { fetchImpl: mockFetch, bypassInterval: true }
    )

    assert.equal(jobs.length, 0)
  })

  test('RemotiveSourceAdapter throws on malformed API structure', async () => {
    const adapter = new RemotiveSourceAdapter()
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({ notJobs: true }),
    })

    await assert.rejects(
      async () =>
        adapter.discoverJobs(
          { roles: [{ value: 'Developer' }] },
          { fetchImpl: mockFetch, bypassInterval: true }
        ),
      /unexpected response structure/
    )
  })

  test('RemotiveSourceAdapter throws on HTTP errors', async () => {
    const adapter = new RemotiveSourceAdapter()
    const mockFetch = async () => ({
      ok: false,
      status: 503,
    })

    await assert.rejects(
      async () =>
        adapter.discoverJobs(
          { roles: [{ value: 'Developer' }] },
          { fetchImpl: mockFetch, bypassInterval: true }
        ),
      /HTTP 503/
    )
  })

  test('RemotiveSourceAdapter respects request interval throttle', async () => {
    const adapter = new RemotiveSourceAdapter()
    resetRemotiveThrottle()

    const mockFetch = async () => ({
      ok: true,
      json: async () => ({ jobs: [] }),
    })

    // First call succeeds
    await adapter.discoverJobs(
      { roles: [{ value: 'Developer' }] },
      { fetchImpl: mockFetch }
    )

    // Immediate second call triggers throttle error
    await assert.rejects(
      async () =>
        adapter.discoverJobs(
          { roles: [{ value: 'Developer' }] },
          { fetchImpl: mockFetch }
        ),
      /Remotive was queried recently/
    )

    resetRemotiveThrottle()
  })
})

describe('Module 4: Persistence, Deduplication & Discovery Service', () => {
  const TEST_SOURCE = 'test_source_verify'
  let createdCompanyIds = []

  after(async () => {
    // Ensure clean teardown of test entities
    await prisma.job.deleteMany({ where: { source: TEST_SOURCE } })
    if (createdCompanyIds.length > 0) {
      await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } })
    }
  })

  test('persistRawJob creates company and new job', async () => {
    const rawJob = {
      source: TEST_SOURCE,
      externalId: 'ext-001',
      title: 'DevOps Engineer',
      companyName: 'CloudScale Inc',
      location: 'Remote',
      workMode: 'remote',
      employmentType: 'full-time',
      salaryText: '$130k',
      url: 'https://example.com/job/ext-001',
      description: 'CI/CD pipeline lead',
      postedAt: new Date('2026-10-05T00:00:00Z'),
      discoveredAt: new Date('2026-10-09T00:00:00Z'),
    }

    const { job, created } = await persistRawJob(rawJob)
    assert.equal(created, true)
    assert.equal(job.externalId, 'ext-001')
    assert.equal(job.title, 'DevOps Engineer')
    assert.equal(job.source, TEST_SOURCE)
    assert.ok(job.companyId)
    createdCompanyIds.push(job.companyId)
  })

  test('persistRawJob updates existing job without creating duplicate', async () => {
    const initialDiscoveredAt = new Date('2026-10-09T00:00:00Z')

    const updatedJob = {
      source: TEST_SOURCE,
      externalId: 'ext-001',
      title: 'Senior DevOps Engineer', // Title updated
      companyName: 'CloudScale Inc',
      location: 'Worldwide Remote',
      workMode: 'remote',
      employmentType: 'full-time',
      salaryText: '$140k',
      url: 'https://example.com/job/ext-001',
      description: 'Updated description',
      postedAt: new Date('2026-10-06T00:00:00Z'),
      discoveredAt: new Date(), // New discovery timestamp
    }

    const { job, created } = await persistRawJob(updatedJob)
    assert.equal(created, false, 'Should be updated, not created')
    assert.equal(job.title, 'Senior DevOps Engineer')

    // Confirm DB only has 1 record for this source + externalId
    const count = await prisma.job.count({
      where: { source: TEST_SOURCE, externalId: 'ext-001' },
    })
    assert.equal(count, 1, 'Should never duplicate record with identical source and externalId')
  })

  test('persistRawJob validates required fields', async () => {
    await assert.rejects(
      async () => persistRawJob({ source: TEST_SOURCE }),
      /missing required fields/
    )
  })
})

describe('Module 4: Discovery Service Preconditions & Failure Isolation', () => {
  test('discoverJobsForLocalUser throws clear error when profile is missing', async () => {
    // Current database has 0 profiles
    await assert.rejects(
      async () => discoverJobsForLocalUser(),
      (err) => {
        assert.ok(err instanceof DiscoveryConfigurationError)
        assert.equal(err.message, 'Create your candidate profile before discovering jobs.')
        return true
      }
    )
  })

  test('discoverJobsForLocalUser isolates source failures', async () => {
    // Create temporary candidate + preferences for this isolated test
    const user = await prisma.user.create({
      data: {
        candidateProfile: {
          create: {
            name: 'Test Candidate',
            email: 'test-isolation@example.com',
            location: 'Remote',
            degree: 'B.Tech',
            university: 'NIT',
            graduationYear: 2024,
            experienceLevel: 'entry',
          },
        },
        jobPreference: {
          create: {
            roles: { create: [{ value: 'Software Engineer' }] },
          },
        },
      },
      include: { candidateProfile: true, jobPreference: true },
    })

    const failingAdapter = {
      name: 'failing_source',
      discoverJobs: async () => {
        throw new Error('Upstream timeout')
      },
    }

    const workingAdapter = {
      name: 'working_source',
      discoverJobs: async () => [
        {
          source: 'working_source',
          externalId: 'w-1',
          title: 'QA Engineer',
          companyName: 'Stable Co',
          url: 'https://example.com/w-1',
        },
      ],
    }

    try {
      const summary = await discoverJobsForLocalUser({
        adapters: [failingAdapter, workingAdapter],
      })

      // Failing source did NOT crash discovery
      assert.equal(summary.sources.failing_source.status, 'error')
      assert.equal(summary.sources.failing_source.message, 'Upstream timeout')

      // Working source succeeded
      assert.equal(summary.sources.working_source.status, 'success')
      assert.equal(summary.sources.working_source.discovered, 1)
      assert.equal(summary.totalStored, 1)

      // Status check
      assert.deepEqual(getDiscoveryStatus(), summary)
    } finally {
      // Teardown: clean up all created test entities
      await prisma.job.deleteMany({ where: { source: 'working_source' } })
      await prisma.company.deleteMany({ where: { name: 'Stable Co' } })
      await prisma.user.delete({ where: { id: user.id } })
    }
  })
})

describe('Module 4: Listing API & Status API', () => {
  test('listDiscoveredJobs returns pagination metadata', async () => {
    const result = await listDiscoveredJobs({ page: 1, limit: 10 })
    assert.equal(result.page, 1)
    assert.equal(result.limit, 10)
    assert.ok(Array.isArray(result.jobs))
    assert.equal(typeof result.total, 'number')
    assert.equal(typeof result.totalPages, 'number')
  })
})

describe('Module 0-3 Regression Verification', () => {
  test('Module 1: Database connectivity is functional', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as alive`
    assert.equal(Number(result[0].alive), 1)
  })

  test('Clean state: zero orphaned test records in production DB', async () => {
    const userCount = await prisma.user.count()
    const profileCount = await prisma.candidateProfile.count()
    const prefCount = await prisma.jobPreference.count()
    const jobCount = await prisma.job.count()

    assert.equal(userCount, 0, 'No fake production users should remain')
    assert.equal(profileCount, 0, 'No fake production profiles should remain')
    assert.equal(prefCount, 0, 'No fake production preferences should remain')
    assert.equal(jobCount, 0, 'No fake production jobs should remain')
  })
})
