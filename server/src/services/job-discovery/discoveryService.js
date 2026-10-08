import { prisma } from '../../lib/prisma.js'
import { validateRawJob } from './adapter.js'
import { remotiveSource } from './sources/remotiveSource.js'

const preferenceInclude = {
  roles: { orderBy: { value: 'asc' } },
  locations: { orderBy: { value: 'asc' } },
  industries: { orderBy: { value: 'asc' } },
  requiredSkills: { include: { skill: true } },
  preferredSkills: { include: { skill: true } },
}

let lastDiscovery = null

export class DiscoveryConfigurationError extends Error {}

export async function persistRawJob(rawJob) {
  if (!validateRawJob(rawJob)) {
    throw new Error('Raw job payload is missing required fields (source, externalId, title, url).')
  }

  const companyName = typeof rawJob.companyName === 'string' && rawJob.companyName.trim()
    ? rawJob.companyName.trim()
    : 'Unknown Company'

  const externalId = String(rawJob.externalId)

  return prisma.$transaction(async (transaction) => {
    let company = await transaction.company.findFirst({ where: { name: companyName } })
    if (!company) {
      company = await transaction.company.create({ data: { name: companyName } })
    }

    const existing = await transaction.job.findUnique({
      where: { source_externalId: { source: rawJob.source, externalId } },
    })

    const commonData = {
      companyId: company.id,
      title: rawJob.title,
      location: rawJob.location ?? null,
      workMode: rawJob.workMode ?? null,
      employmentType: rawJob.employmentType ?? null,
      salaryText: rawJob.salaryText ?? null,
      description: rawJob.description ?? null,
      jobUrl: rawJob.url,
      postedAt: rawJob.postedAt ?? null,
    }

    const job = existing
      ? await transaction.job.update({
          where: { id: existing.id },
          data: commonData,
        })
      : await transaction.job.create({
          data: {
            ...commonData,
            source: rawJob.source,
            externalId,
            discoveredAt: rawJob.discoveredAt ?? new Date(),
            status: 'discovered',
          },
        })

    return { job, created: !existing }
  })
}

export async function discoverJobsForLocalUser({ adapters = [remotiveSource], force = false, limit = 20 } = {}) {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    include: { candidateProfile: true, jobPreference: { include: preferenceInclude } },
  })

  if (!user?.candidateProfile) {
    throw new DiscoveryConfigurationError('Create your candidate profile before discovering jobs.')
  }
  if (!user.jobPreference) {
    throw new DiscoveryConfigurationError('Configure job preferences before discovering jobs.')
  }

  const sources = {}
  let totalDiscovered = 0
  let totalStored = 0

  for (const adapter of adapters) {
    try {
      const rawJobs = await adapter.discoverJobs(user.jobPreference, { bypassInterval: force, limit })
      let stored = 0
      let created = 0
      let updated = 0
      let skipped = 0

      for (const rawJob of rawJobs) {
        try {
          const result = await persistRawJob(rawJob)
          stored += 1
          if (result.created) created += 1
          else updated += 1
        } catch (error) {
          skipped += 1
          console.error(`Could not persist job from ${adapter.name}:`, error.message)
        }
      }

      totalDiscovered += rawJobs.length
      totalStored += stored
      sources[adapter.name] = {
        status: 'success',
        discovered: rawJobs.length,
        stored,
        created,
        updated,
        skipped,
      }
    } catch (error) {
      console.error(`Job source ${adapter.name} failed:`, error.message)
      sources[adapter.name] = {
        status: 'error',
        message: error.message || 'Source unavailable.',
      }
    }
  }

  lastDiscovery = {
    completedAt: new Date(),
    sources,
    totalDiscovered,
    totalStored,
  }

  return lastDiscovery
}

export function getDiscoveryStatus() {
  return lastDiscovery
}

export async function listDiscoveredJobs({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit
  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      include: { company: true },
      orderBy: [{ discoveredAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.job.count(),
  ])

  return { jobs, total, page, limit, totalPages: Math.ceil(total / limit) }
}
