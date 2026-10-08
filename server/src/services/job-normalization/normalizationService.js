import { prisma } from '../../lib/prisma.js'
import { normalizeTitle } from './titleNormalizer.js'
import { normalizeCompany } from './companyNormalizer.js'
import { normalizeLocation } from './locationNormalizer.js'
import { normalizeWorkMode } from './workModeNormalizer.js'
import { normalizeEmploymentType } from './employmentNormalizer.js'
import { parseSalary } from './salaryParser.js'
import { extractSkillsFromText } from './skillNormalizer.js'
import { findDuplicateCandidate } from './deduplicationService.js'

/**
 * Derives normalized data from raw job attributes.
 */
export function deriveNormalizedData(rawJob) {
  const normTitle = normalizeTitle(rawJob.title)
  const companyName = rawJob.company?.name || rawJob.companyName || ''
  const normCompany = normalizeCompany(companyName)
  const normLocation = normalizeLocation(rawJob.location)
  const normWorkMode = normalizeWorkMode(rawJob.workMode, `${rawJob.title} ${rawJob.location || ''}`)
  const normEmployment = normalizeEmploymentType(rawJob.employmentType, `${rawJob.title} ${rawJob.description || ''}`)
  const { salaryMin, salaryMax, salaryCurrency } = parseSalary(rawJob.salaryText)
  const extractedSkills = extractSkillsFromText(`${rawJob.title} ${rawJob.description || ''}`)

  return {
    normalizedTitle: normTitle,
    normalizedCompany: normCompany,
    normalizedLocation: normLocation,
    normalizedWorkMode: normWorkMode,
    normalizedEmploymentType: normEmployment,
    salaryMin,
    salaryMax,
    salaryCurrency,
    skills: extractedSkills,
  }
}

/**
 * Normalizes a specific job in the database by ID and checks for cross-source duplicates.
 */
export async function normalizeJobById(jobId) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { company: true, skills: true },
  })

  if (!job) throw new Error(`Job not found: ${jobId}`)

  const normalized = deriveNormalizedData(job)

  // Link skills in database
  const skillConnects = []
  for (const skillName of normalized.skills) {
    const skillRecord = await prisma.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName },
    })
    skillConnects.push({ id: skillRecord.id })
  }

  // Find duplicates among other already-normalized canonical jobs
  const candidatePool = await prisma.job.findMany({
    where: {
      id: { not: jobId },
      normalizedTitle: { not: null },
      isDuplicate: false,
    },
    include: { company: true },
    take: 100,
  })

  const { isDuplicate, confidence, reasons, candidate } = findDuplicateCandidate(
    { ...job, ...normalized },
    candidatePool
  )

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      normalizedTitle: normalized.normalizedTitle,
      normalizedCompany: normalized.normalizedCompany,
      normalizedLocation: normalized.normalizedLocation,
      normalizedWorkMode: normalized.normalizedWorkMode,
      normalizedEmploymentType: normalized.normalizedEmploymentType,
      salaryMin: normalized.salaryMin,
      salaryMax: normalized.salaryMax,
      salaryCurrency: normalized.salaryCurrency,
      isDuplicate,
      duplicateConfidence: confidence,
      duplicateReason: reasons.join('; ') || null,
      canonicalJobId: isDuplicate && candidate ? candidate.id : null,
      skills: { set: skillConnects },
    },
    include: { company: true, skills: true },
  })

  return updated
}

/**
 * Normalizes all jobs that currently lack normalized fields.
 * Idempotent: can be run repeatedly without duplicating records.
 */
export async function normalizeAllJobs({ limit = 100 } = {}) {
  const unnormalized = await prisma.job.findMany({
    where: { normalizedTitle: null },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })

  let processed = 0
  let duplicatesFound = 0

  for (const job of unnormalized) {
    try {
      const result = await normalizeJobById(job.id)
      processed++
      if (result.isDuplicate) duplicatesFound++
    } catch (err) {
      console.error(`Error normalizing job ${job.id}:`, err.message)
    }
  }

  return {
    processed,
    duplicatesFound,
    remainingUnnormalized: Math.max(0, unnormalized.length - processed),
  }
}
