/**
 * Cross-source deduplication engine.
 * Employs candidate blocking (by normalized company or title keywords) and
 * multi-signal similarity calculation (title, company, location, workMode, description, date proximity).
 * Assigns confidence:
 * >= 0.85 -> duplicate (links to canonicalJobId)
 * 0.65 - 0.84 -> review
 * < 0.65 -> distinct
 */

function tokenize(text = '') {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  )
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size && !setB.size) return 1.0
  if (!setA.size || !setB.size) return 0.0
  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union > 0 ? intersection / union : 0.0
}

function stringSimilarity(strA = '', strB = '') {
  const sA = (strA || '').trim().toLowerCase()
  const sB = (strB || '').trim().toLowerCase()
  if (sA === sB) return 1.0
  if (!sA || !sB) return 0.0
  return jaccardSimilarity(tokenize(sA), tokenize(sB))
}

/**
 * Calculates match confidence between two normalized jobs.
 * @param {object} jobA
 * @param {object} jobB
 * @returns {{ confidence: number, reasons: string[] }}
 */
export function calculateJobSimilarity(jobA, jobB) {
  const reasons = []

  // 1. Same source & externalId is 100% duplicate
  if (
    jobA.source &&
    jobB.source &&
    jobA.source === jobB.source &&
    jobA.externalId &&
    jobB.externalId &&
    jobA.externalId === jobB.externalId
  ) {
    return { confidence: 1.0, reasons: ['Exact source and externalId match'] }
  }

  // Same exact URL
  if (jobA.jobUrl && jobB.jobUrl && jobA.jobUrl === jobB.jobUrl) {
    return { confidence: 1.0, reasons: ['Identical job URL'] }
  }

  const companySim = stringSimilarity(
    jobA.normalizedCompany || jobA.company?.name,
    jobB.normalizedCompany || jobB.company?.name
  )

  const titleSim = stringSimilarity(jobA.normalizedTitle || jobA.title, jobB.normalizedTitle || jobB.title)

  // If company is completely different, highly unlikely to be duplicate
  if (companySim < 0.4) {
    return { confidence: 0.1, reasons: ['Different companies'] }
  }

  // Location similarity
  const locSim = stringSimilarity(
    jobA.normalizedLocation || jobA.location,
    jobB.normalizedLocation || jobB.location
  )

  // Work mode compatibility
  const modeA = (jobA.normalizedWorkMode || jobA.workMode || '').toLowerCase()
  const modeB = (jobB.normalizedWorkMode || jobB.workMode || '').toLowerCase()
  const modeSim = modeA === modeB || modeA === 'unknown' || modeB === 'unknown' ? 1.0 : 0.5

  // Description similarity
  const descSim = jaccardSimilarity(tokenize(jobA.description), tokenize(jobB.description))

  // Date proximity (within 14 days)
  let dateSim = 0.8
  if (jobA.postedAt && jobB.postedAt) {
    const diffDays = Math.abs(new Date(jobA.postedAt) - new Date(jobB.postedAt)) / (1000 * 60 * 60 * 24)
    dateSim = diffDays <= 7 ? 1.0 : diffDays <= 21 ? 0.8 : 0.4
  }

  // Weighted composite confidence
  // Company: 35%, Title: 35%, Description: 15%, Location: 10%, WorkMode: 5%
  const confidence = Number(
    (
      companySim * 0.35 +
      titleSim * 0.35 +
      descSim * 0.15 +
      locSim * 0.10 +
      modeSim * 0.05
    ).toFixed(3)
  )

  if (companySim >= 0.8) reasons.push('Matching company')
  if (titleSim >= 0.8) reasons.push('Matching job title')
  if (descSim >= 0.6) reasons.push('High description similarity')
  if (locSim >= 0.8) reasons.push('Matching location')

  return { confidence, reasons }
}

/**
 * Finds cross-source duplicates for a target job among a candidate pool.
 * Uses candidate blocking by company name or title keyword to keep search O(candidates).
 */
export function findDuplicateCandidate(targetJob, existingJobs = []) {
  const targetCompany = (targetJob.normalizedCompany || targetJob.company?.name || '').toLowerCase()
  const targetTitleTokens = tokenize(targetJob.normalizedTitle || targetJob.title)

  // Candidate blocking: only compare if company matches or title shares significant tokens
  const candidates = existingJobs.filter((job) => {
    if (job.id === targetJob.id) return false
    const comp = (job.normalizedCompany || job.company?.name || '').toLowerCase()
    if (targetCompany && comp && (targetCompany === comp || comp.includes(targetCompany) || targetCompany.includes(comp))) {
      return true
    }
    const titleTokens = tokenize(job.normalizedTitle || job.title)
    return jaccardSimilarity(targetTitleTokens, titleTokens) >= 0.5
  })

  let bestMatch = null
  let highestConfidence = 0
  let bestReasons = []

  for (const candidate of candidates) {
    const { confidence, reasons } = calculateJobSimilarity(targetJob, candidate)
    if (confidence > highestConfidence) {
      highestConfidence = confidence
      bestMatch = candidate
      bestReasons = reasons
    }
  }

  return {
    candidate: bestMatch,
    confidence: highestConfidence,
    reasons: bestReasons,
    isDuplicate: highestConfidence >= 0.85,
    needsReview: highestConfidence >= 0.65 && highestConfidence < 0.85,
  }
}
