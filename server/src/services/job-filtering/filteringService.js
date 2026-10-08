import { prisma } from '../../lib/prisma.js'

const preferenceInclude = {
  roles: { orderBy: { value: 'asc' } },
  locations: { orderBy: { value: 'asc' } },
  industries: { orderBy: { value: 'asc' } },
  requiredSkills: { include: { skill: true } },
  preferredSkills: { include: { skill: true } },
}

/**
 * Evaluates a single normalized job against candidate job preferences.
 * Separates Hard Filters from Soft Preferences and returns explainable reasons.
 *
 * @param {object} job - Normalized job
 * @param {object} preferences - JobPreference with relations
 * @returns {{ eligible: boolean, status: 'eligible'|'rejected'|'review', reasons: string[] }}
 */
export function evaluateJobFit(job, preferences) {
  const hardViolations = []
  const softNotes = []

  if (!preferences) {
    return { eligible: true, status: 'eligible', reasons: ['No specific preferences configured'] }
  }

  // 1. Work Mode Hard Filter
  const userMode = (preferences.preferredWorkMode || 'any').toLowerCase()
  const jobMode = (job.normalizedWorkMode || job.workMode || 'unknown').toLowerCase()

  if (userMode !== 'any' && jobMode !== 'unknown') {
    if (userMode === 'remote' && jobMode === 'on-site') {
      hardViolations.push(`Work mode mismatch: Requires on-site attendance while remote was requested`)
    } else if (userMode === 'on-site' && jobMode === 'remote') {
      softNotes.push(`Job is remote while preferred mode is on-site`)
    }
  }

  // 2. Employment Type Hard Filter
  const userEmp = (preferences.employmentType || 'any').toLowerCase()
  const jobEmp = (job.normalizedEmploymentType || job.employmentType || 'unknown').toLowerCase()

  if (userEmp !== 'any' && jobEmp !== 'unknown') {
    if (userEmp === 'full-time' && (jobEmp === 'internship' || jobEmp === 'temporary')) {
      hardViolations.push(`Employment type mismatch: Listing is ${jobEmp} while full-time was requested`)
    } else if (userEmp === 'internship' && jobEmp === 'full-time') {
      softNotes.push(`Listing is full-time while internship was preferred`)
    }
  }

  // 3. Salary Floor Hard Filter (only applied when job salary is known)
  const minRequiredSalary = preferences.minimumSalary
  if (minRequiredSalary && Number.isFinite(minRequiredSalary) && minRequiredSalary > 0) {
    const jobTopSalary = job.salaryMax || job.salaryMin
    // Only filter if currency matches INR or USD equivalent
    if (jobTopSalary && jobTopSalary < minRequiredSalary * 0.8) {
      hardViolations.push(`Salary below minimum: Offered maximum is ${job.salaryCurrency || ''} ${jobTopSalary}, required is ${minRequiredSalary}`)
    }
  }

  // 4. Location & Relocation Hard Filter
  const preferredLocations = preferences.locations?.map((l) => l.value.toLowerCase()) || []
  const jobLocation = (job.normalizedLocation || job.location || '').toLowerCase()
  const isRemoteJob = jobMode === 'remote' || jobLocation.includes('remote')

  if (!isRemoteJob && preferredLocations.length > 0) {
    const matchesPreferredLoc = preferredLocations.some((loc) => jobLocation.includes(loc))
    if (!matchesPreferredLoc) {
      if (!preferences.willingToRelocate) {
        hardViolations.push(`Location not preferred (${job.normalizedLocation || 'Unknown'}) and relocation is disabled`)
      } else {
        softNotes.push(`Location differs from primary preferences (${job.normalizedLocation || 'Unknown'}), relocation required`)
      }
    }
  }

  // 5. Role Keyword Compatibility
  const preferredRoles = preferences.roles?.map((r) => r.value.toLowerCase()) || []
  const jobTitle = (job.normalizedTitle || job.title || '').toLowerCase()

  if (preferredRoles.length > 0) {
    const roleMatched = preferredRoles.some((role) => {
      const words = role.split(/\s+/).filter((w) => w.length > 2)
      return words.some((w) => jobTitle.includes(w))
    })

    if (!roleMatched) {
      softNotes.push(`Role does not closely match preferred titles: ${preferredRoles.slice(0, 3).join(', ')}`)
    }
  }

  // 6. Required Skills Evaluation
  const requiredSkills = preferences.requiredSkills?.map((s) => s.skill.name.toLowerCase()) || []
  const jobSkills = job.skills?.map((s) => s.name.toLowerCase()) || []

  if (requiredSkills.length > 0 && jobSkills.length > 0) {
    const matchedCount = requiredSkills.filter((rs) => jobSkills.includes(rs)).length
    if (matchedCount === 0 && requiredSkills.length >= 2) {
      softNotes.push(`None of the configured required skills (${requiredSkills.join(', ')}) were detected in listing`)
    }
  }

  // Determine Final Status
  if (hardViolations.length > 0) {
    return {
      eligible: false,
      status: 'rejected',
      reasons: hardViolations,
    }
  }

  if (softNotes.length >= 2) {
    return {
      eligible: true,
      status: 'review',
      reasons: softNotes,
    }
  }

  return {
    eligible: true,
    status: 'eligible',
    reasons: softNotes.length > 0 ? softNotes : ['Matches candidate preferences'],
  }
}

/**
 * Filters all normalized jobs against the current user's job preferences.
 */
export async function filterJobsForLocalUser() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    include: { jobPreference: { include: preferenceInclude } },
  })

  if (!user?.jobPreference) {
    throw new Error('Configure job preferences before filtering jobs.')
  }

  const jobs = await prisma.job.findMany({
    where: { isDuplicate: false },
    include: { company: true, skills: true },
  })

  let eligible = 0
  let rejected = 0
  let review = 0

  for (const job of jobs) {
    const result = evaluateJobFit(job, user.jobPreference)
    if (result.status === 'eligible') eligible++
    else if (result.status === 'rejected') rejected++
    else if (result.status === 'review') review++

    await prisma.job.update({
      where: { id: job.id },
      data: {
        filterStatus: result.status,
        filterReasons: JSON.stringify(result.reasons),
      },
    })
  }

  return {
    processed: jobs.length,
    eligible,
    rejected,
    review,
  }
}
