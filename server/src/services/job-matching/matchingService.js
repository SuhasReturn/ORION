import { prisma } from '../../lib/prisma.js'

const preferenceInclude = {
  roles: { orderBy: { value: 'asc' } },
  locations: { orderBy: { value: 'asc' } },
  industries: { orderBy: { value: 'asc' } },
  requiredSkills: { include: { skill: true } },
  preferredSkills: { include: { skill: true } },
}

const EXPERIENCE_HIERARCHY = {
  student: 1,
  entry: 2,
  junior: 3,
  mid: 4,
  senior: 5,
}

/**
 * Categorizes a numeric score (0-100) into a qualitative rating.
 */
export function getScoreRating(score) {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'strong'
  if (score >= 60) return 'moderate'
  if (score >= 40) return 'weak'
  return 'poor'
}

/**
 * Deterministically computes the match score (0-100) between a candidate and a job.
 * Weighted breakdown:
 * - Role / Title match: 25%
 * - Skills match: 30%
 * - Experience match: 15%
 * - Location match: 10%
 * - Work mode match: 10%
 * - Employment type: 5%
 * - Salary match: 5%
 *
 * @param {object} candidate - User with candidateProfile and jobPreference
 * @param {object} job - Normalized job
 */
export function calculateJobMatch(candidate, job) {
  const profile = candidate.candidateProfile || {}
  const prefs = candidate.jobPreference || {}
  const breakdown = {}
  const reasons = []

  // 1. Role Match (25 points)
  let roleScore = 0
  const candidateRoles = (prefs.roles?.map((r) => r.value.toLowerCase()) || []).concat(
    profile.currentRole ? [profile.currentRole.toLowerCase()] : []
  )
  const jobTitle = (job.normalizedTitle || job.title || '').toLowerCase()

  if (candidateRoles.length === 0) {
    roleScore = 15 // neutral
  } else {
    for (const r of candidateRoles) {
      if (jobTitle === r) {
        roleScore = 25
        reasons.push(`Exact role match: "${job.normalizedTitle || job.title}"`)
        break
      }
      const words = r.split(/\s+/).filter((w) => w.length > 2)
      const matches = words.filter((w) => jobTitle.includes(w))
      if (matches.length > 0) {
        const partial = Math.min(25, Math.round((matches.length / words.length) * 22))
        if (partial > roleScore) {
          roleScore = partial
          reasons.push(`Close title match: contains "${matches.join(', ')}"`)
        }
      }
    }
    if (roleScore === 0) roleScore = 5
  }
  breakdown.role = roleScore

  // 2. Skills Match (30 points)
  // Combine profile skills + preferred skills
  const candidateSkills = new Set([
    ...(profile.skills?.map((s) => s.name.toLowerCase()) || []),
    ...(prefs.requiredSkills?.map((s) => s.skill.name.toLowerCase()) || []),
    ...(prefs.preferredSkills?.map((s) => s.skill.name.toLowerCase()) || []),
  ])

  const jobSkills = job.skills?.map((s) => s.name) || []
  const matchedSkills = []
  const missingSkills = []

  for (const jSkill of jobSkills) {
    if (candidateSkills.has(jSkill.toLowerCase())) {
      matchedSkills.push(jSkill)
    } else {
      missingSkills.push(jSkill)
    }
  }

  let skillScore = 0
  if (jobSkills.length === 0) {
    skillScore = 18 // Neutral when no skills could be extracted from listing
  } else {
    const coverage = matchedSkills.length / jobSkills.length
    skillScore = Math.round(coverage * 30)
    if (matchedSkills.length > 0) {
      reasons.push(`Matched ${matchedSkills.length} key skill(s): ${matchedSkills.slice(0, 4).join(', ')}`)
    }
    if (missingSkills.length > 0) {
      reasons.push(`Opportunity to learn: ${missingSkills.slice(0, 3).join(', ')}`)
    }
  }
  breakdown.skills = skillScore

  // 3. Experience Match (15 points)
  let expScore = 12
  const candidateLevel = (profile.experienceLevel || prefs.experienceLevel || 'entry').toLowerCase()
  const candidateRank = EXPERIENCE_HIERARCHY[candidateLevel] || 2
  const jobTitleLower = (job.normalizedTitle || job.title || '').toLowerCase()

  let jobRank = 2
  if (/\b(intern|internship)\b/.test(jobTitleLower)) jobRank = 1
  else if (/\b(junior|jr|entry)\b/.test(jobTitleLower)) jobRank = 2
  else if (/\b(senior|sr|lead)\b/.test(jobTitleLower)) jobRank = 4
  else if (/\b(principal|staff|director|head)\b/.test(jobTitleLower)) jobRank = 5
  else jobRank = 3 // Mid

  const diff = Math.abs(candidateRank - jobRank)
  if (diff === 0) {
    expScore = 15
    reasons.push(`Experience level aligns directly (${candidateLevel})`)
  } else if (diff === 1) {
    expScore = 11
  } else {
    expScore = 6
  }
  breakdown.experience = expScore

  // 4. Location Match (10 points)
  let locScore = 7
  const jobLoc = (job.normalizedLocation || job.location || '').toLowerCase()
  const jobMode = (job.normalizedWorkMode || job.workMode || '').toLowerCase()
  const prefLocs = prefs.locations?.map((l) => l.value.toLowerCase()) || []

  if (jobMode === 'remote' || jobLoc.includes('remote') || jobLoc.includes('worldwide')) {
    locScore = 10
    reasons.push('Remote location flexibility')
  } else if (prefLocs.some((l) => jobLoc.includes(l))) {
    locScore = 10
    reasons.push(`Location matches preference: ${job.normalizedLocation}`)
  } else if (prefs.willingToRelocate) {
    locScore = 7
    reasons.push('Willing to relocate for position')
  } else {
    locScore = 3
  }
  breakdown.location = locScore

  // 5. Work Mode Match (10 points)
  let modeScore = 6
  const userMode = (prefs.preferredWorkMode || 'any').toLowerCase()
  if (userMode === 'any' || userMode === jobMode) {
    modeScore = 10
    reasons.push(`Work mode matches: ${job.normalizedWorkMode || 'Flexible'}`)
  } else if (jobMode === 'unknown') {
    modeScore = 7
  } else {
    modeScore = 3
  }
  breakdown.workMode = modeScore

  // 6. Employment Type Match (5 points)
  let empScore = 3
  const userEmp = (prefs.employmentType || 'any').toLowerCase()
  const jobEmp = (job.normalizedEmploymentType || job.employmentType || '').toLowerCase()
  if (userEmp === 'any' || userEmp === jobEmp) {
    empScore = 5
  } else {
    empScore = 2
  }
  breakdown.employment = empScore

  // 7. Salary Match (5 points)
  let salScore = 3
  if (prefs.minimumSalary && (job.salaryMax || job.salaryMin)) {
    const jobSal = job.salaryMax || job.salaryMin
    if (jobSal >= prefs.minimumSalary) {
      salScore = 5
      reasons.push(`Meets or exceeds minimum salary (${job.salaryCurrency || ''} ${jobSal})`)
    } else {
      salScore = 1
    }
  } else {
    salScore = 4 // Neutral if salary unlisted
  }
  breakdown.salary = salScore

  // Total Score (0 - 100)
  const totalScore = Math.min(
    100,
    Math.max(0, roleScore + skillScore + expScore + locScore + modeScore + empScore + salScore)
  )

  const rating = getScoreRating(totalScore)

  return {
    score: totalScore,
    rating,
    matchedSkills,
    missingSkills,
    reasons,
    breakdown,
  }
}

/**
 * Computes deterministic match scores for all non-duplicate jobs.
 */
export async function matchJobsForLocalUser() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    include: {
      candidateProfile: { include: { skills: true } },
      jobPreference: { include: preferenceInclude },
    },
  })

  if (!user?.candidateProfile) {
    throw new Error('Create candidate profile before matching jobs.')
  }

  const jobs = await prisma.job.findMany({
    where: { isDuplicate: false },
    include: { company: true, skills: true },
  })

  let processed = 0
  let topScore = 0

  for (const job of jobs) {
    const match = calculateJobMatch(user, job)
    if (match.score > topScore) topScore = match.score
    processed++

    await prisma.job.update({
      where: { id: job.id },
      data: {
        matchScore: match.score,
        matchRating: match.rating,
        matchedSkills: JSON.stringify(match.matchedSkills),
        missingSkills: JSON.stringify(match.missingSkills),
        matchReasons: JSON.stringify(match.reasons),
      },
    })
  }

  return {
    processed,
    matched: processed,
    topScore,
  }
}
