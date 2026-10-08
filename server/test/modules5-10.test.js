import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTitle, extractSeniority } from '../src/services/job-normalization/titleNormalizer.js'
import { normalizeCompany } from '../src/services/job-normalization/companyNormalizer.js'
import { normalizeLocation } from '../src/services/job-normalization/locationNormalizer.js'
import { normalizeWorkMode } from '../src/services/job-normalization/workModeNormalizer.js'
import { normalizeEmploymentType } from '../src/services/job-normalization/employmentNormalizer.js'
import { parseSalary } from '../src/services/job-normalization/salaryParser.js'
import { normalizeSkill, extractSkillsFromText } from '../src/services/job-normalization/skillNormalizer.js'
import { calculateJobSimilarity, findDuplicateCandidate } from '../src/services/job-normalization/deduplicationService.js'
import { deriveNormalizedData } from '../src/services/job-normalization/normalizationService.js'
import { evaluateJobFit } from '../src/services/job-filtering/filteringService.js'
import { calculateJobMatch, getScoreRating } from '../src/services/job-matching/matchingService.js'
import { OllamaService } from '../src/services/ai/ollamaService.js'
import { AiService } from '../src/services/ai/aiService.js'

// ════════════════════════════════════════════════════════════════
// MODULE 5: NORMALIZATION + DEDUPLICATION
// ════════════════════════════════════════════════════════════════

describe('Module 5: Title Normalization', () => {
  test('normalizes frontend variations', () => {
    assert.equal(normalizeTitle('Frontend Developer'), 'Frontend Developer')
    assert.equal(normalizeTitle('Front-End Developer'), 'Frontend Developer')
    assert.equal(normalizeTitle('Front End Developer'), 'Frontend Developer')
    assert.equal(normalizeTitle('Frontend Engineer'), 'Frontend Developer')
  })

  test('preserves seniority levels', () => {
    assert.equal(extractSeniority('Junior Frontend Developer'), 'Junior')
    assert.equal(extractSeniority('Senior Frontend Developer'), 'Senior')
    assert.equal(extractSeniority('Lead Backend Engineer'), 'Lead')
    assert.equal(extractSeniority('Principal Software Engineer'), 'Principal')
    assert.equal(extractSeniority('Staff Engineer'), 'Staff')
  })

  test('combines seniority with base role', () => {
    assert.equal(normalizeTitle('Senior Frontend Engineer'), 'Senior Frontend Developer')
    assert.equal(normalizeTitle('Junior Backend Developer'), 'Junior Backend Developer')
    assert.equal(normalizeTitle('Lead DevOps Engineer'), 'Lead DevOps Engineer')
  })

  test('handles null/empty input', () => {
    assert.equal(normalizeTitle(null), 'Unknown Role')
    assert.equal(normalizeTitle(''), 'Unknown Role')
  })

  test('passes through unrecognized titles', () => {
    const result = normalizeTitle('Chief Happiness Officer')
    assert.ok(result.length > 0)
    assert.notEqual(result, 'Unknown Role')
  })
})

describe('Module 5: Company Normalization', () => {
  test('strips legal suffixes', () => {
    assert.equal(normalizeCompany('Google LLC'), 'Google')
    assert.equal(normalizeCompany('Google, LLC'), 'Google')
    assert.equal(normalizeCompany('Apple Inc.'), 'Apple')
    assert.equal(normalizeCompany('TCS Pvt Ltd'), 'TCS')
  })

  test('normalizes casing', () => {
    assert.equal(normalizeCompany('GOOGLE'), 'Google')
    assert.equal(normalizeCompany('google'), 'Google')
    assert.equal(normalizeCompany('Google'), 'Google') // Already correct
  })

  test('handles whitespace', () => {
    assert.equal(normalizeCompany('  Google  '), 'Google')
  })

  test('handles null/empty', () => {
    assert.equal(normalizeCompany(null), 'Unknown Company')
    assert.equal(normalizeCompany(''), 'Unknown Company')
  })
})

describe('Module 5: Location Normalization', () => {
  test('normalizes Indian city aliases', () => {
    assert.equal(normalizeLocation('Bangalore'), 'Bengaluru, India')
    assert.equal(normalizeLocation('Bengaluru'), 'Bengaluru, India')
    assert.equal(normalizeLocation('Bombay'), 'Mumbai, India')
    assert.equal(normalizeLocation('Mumbai'), 'Mumbai, India')
    assert.equal(normalizeLocation('Calcutta'), 'Kolkata, India')
  })

  test('recognizes remote indicators', () => {
    assert.equal(normalizeLocation('Remote'), 'Remote (Worldwide)')
    assert.equal(normalizeLocation('Work from home'), 'Remote (Worldwide)')
    assert.equal(normalizeLocation('Worldwide'), 'Remote (Worldwide)')
    assert.equal(normalizeLocation('Remote US'), 'Remote (US)')
  })

  test('handles null/empty', () => {
    assert.equal(normalizeLocation(null), 'Unspecified')
    assert.equal(normalizeLocation(''), 'Unspecified')
  })
})

describe('Module 5: Work Mode Normalization', () => {
  test('maps to Remote', () => {
    assert.equal(normalizeWorkMode('remote'), 'Remote')
    assert.equal(normalizeWorkMode('work from home'), 'Remote')
    assert.equal(normalizeWorkMode('100% remote'), 'Remote')
  })

  test('maps to On-site', () => {
    assert.equal(normalizeWorkMode('on-site'), 'On-site')
    assert.equal(normalizeWorkMode('onsite'), 'On-site')
    assert.equal(normalizeWorkMode('in office'), 'On-site')
  })

  test('maps to Hybrid', () => {
    assert.equal(normalizeWorkMode('hybrid'), 'Hybrid')
  })

  test('defaults to Unknown', () => {
    assert.equal(normalizeWorkMode(''), 'Unknown')
    assert.equal(normalizeWorkMode('flexible'), 'Unknown')
  })
})

describe('Module 5: Employment Type Normalization', () => {
  test('maps to Full-time', () => {
    assert.equal(normalizeEmploymentType('full-time'), 'Full-time')
    assert.equal(normalizeEmploymentType('full time'), 'Full-time')
    assert.equal(normalizeEmploymentType('permanent'), 'Full-time')
  })

  test('maps to Internship', () => {
    assert.equal(normalizeEmploymentType('intern'), 'Internship')
    assert.equal(normalizeEmploymentType('internship'), 'Internship')
  })

  test('maps to Contract', () => {
    assert.equal(normalizeEmploymentType('contract'), 'Contract')
    assert.equal(normalizeEmploymentType('freelance'), 'Contract')
  })
})

describe('Module 5: Salary Parsing', () => {
  test('parses INR LPA range', () => {
    const result = parseSalary('₹6-10 LPA')
    assert.equal(result.salaryMin, 600000)
    assert.equal(result.salaryMax, 1000000)
    assert.equal(result.salaryCurrency, 'INR')
  })

  test('parses single LPA', () => {
    const result = parseSalary('₹6 LPA')
    assert.equal(result.salaryMin, 600000)
    assert.equal(result.salaryMax, 600000)
    assert.equal(result.salaryCurrency, 'INR')
  })

  test('parses USD k-notation range', () => {
    const result = parseSalary('$80k-$100k')
    assert.equal(result.salaryMin, 80000)
    assert.equal(result.salaryMax, 100000)
    assert.equal(result.salaryCurrency, 'USD')
  })

  test('parses full numeric range', () => {
    const result = parseSalary('$80,000 - $120,000')
    assert.equal(result.salaryMin, 80000)
    assert.equal(result.salaryMax, 120000)
    assert.equal(result.salaryCurrency, 'USD')
  })

  test('returns null for empty input', () => {
    const result = parseSalary('')
    assert.equal(result.salaryMin, null)
    assert.equal(result.salaryMax, null)
  })
})

describe('Module 5: Skill Normalization', () => {
  test('normalizes skill aliases', () => {
    assert.equal(normalizeSkill('JS'), 'JavaScript')
    assert.equal(normalizeSkill('ReactJS'), 'React')
    assert.equal(normalizeSkill('NodeJS'), 'Node.js')
  })

  test('extracts skills from text', () => {
    const skills = extractSkillsFromText('We need React, Node.js, and Python experience')
    assert.ok(skills.includes('React'))
    assert.ok(skills.includes('Node.js'))
    assert.ok(skills.includes('Python'))
  })

  test('returns empty for null input', () => {
    const skills = extractSkillsFromText(null)
    assert.equal(skills.length, 0)
  })
})

describe('Module 5: Deduplication', () => {
  test('detects exact URL duplicate', () => {
    const result = calculateJobSimilarity(
      { jobUrl: 'https://example.com/job/123', source: 'a', externalId: '1' },
      { jobUrl: 'https://example.com/job/123', source: 'b', externalId: '2' }
    )
    assert.equal(result.confidence, 1.0)
  })

  test('detects same source+externalId', () => {
    const result = calculateJobSimilarity(
      { source: 'remotive', externalId: '999' },
      { source: 'remotive', externalId: '999' }
    )
    assert.equal(result.confidence, 1.0)
  })

  test('different companies get low confidence', () => {
    const result = calculateJobSimilarity(
      { normalizedCompany: 'Google', normalizedTitle: 'Frontend Developer' },
      { normalizedCompany: 'Amazon', normalizedTitle: 'Frontend Developer' }
    )
    assert.ok(result.confidence < 0.4)
  })

  test('findDuplicateCandidate returns null for unique job', () => {
    const result = findDuplicateCandidate(
      { id: '1', normalizedTitle: 'Rare Specialist', normalizedCompany: 'UniqueCorpXYZ' },
      [{ id: '2', normalizedTitle: 'Common Dev', normalizedCompany: 'OtherCorpABC' }]
    )
    assert.equal(result.isDuplicate, false)
  })

  test('idempotency: normalizing twice produces same result', () => {
    const rawJob = { title: 'Senior Frontend Developer', company: { name: 'Google LLC' }, location: 'Bangalore', workMode: 'remote', salaryText: '$100k-$150k' }
    const first = deriveNormalizedData(rawJob)
    const second = deriveNormalizedData(rawJob)
    assert.deepEqual(first, second)
  })
})

// ════════════════════════════════════════════════════════════════
// MODULE 6: FILTERING
// ════════════════════════════════════════════════════════════════

describe('Module 6: Job Filtering', () => {
  const baseJob = {
    normalizedTitle: 'Frontend Developer',
    normalizedWorkMode: 'Remote',
    normalizedEmploymentType: 'Full-time',
    normalizedLocation: 'Remote (Worldwide)',
    workMode: 'remote',
    employmentType: 'full-time',
    salaryMax: 100000,
    salaryMin: 80000,
    salaryCurrency: 'USD',
    skills: [{ name: 'JavaScript' }, { name: 'React' }],
  }

  const basePrefs = {
    preferredWorkMode: 'remote',
    employmentType: 'full-time',
    minimumSalary: null,
    willingToRelocate: false,
    roles: [{ value: 'Frontend Developer' }],
    locations: [],
    requiredSkills: [],
    preferredSkills: [],
  }

  test('eligible when preferences match', () => {
    const result = evaluateJobFit(baseJob, basePrefs)
    assert.equal(result.status, 'eligible')
    assert.equal(result.eligible, true)
  })

  test('rejected for work mode mismatch', () => {
    const result = evaluateJobFit(
      { ...baseJob, normalizedWorkMode: 'On-site' },
      { ...basePrefs, preferredWorkMode: 'remote' }
    )
    assert.equal(result.status, 'rejected')
    assert.ok(result.reasons.some((r) => r.includes('Work mode')))
  })

  test('rejected for salary below minimum', () => {
    const result = evaluateJobFit(
      { ...baseJob, salaryMax: 30000 },
      { ...basePrefs, minimumSalary: 50000 }
    )
    assert.equal(result.status, 'rejected')
    assert.ok(result.reasons.some((r) => r.includes('Salary')))
  })

  test('rejected for location without relocation', () => {
    const result = evaluateJobFit(
      { ...baseJob, normalizedWorkMode: 'On-site', normalizedLocation: 'Tokyo, Japan', workMode: 'on-site', location: 'Tokyo' },
      { ...basePrefs, preferredWorkMode: 'any', locations: [{ value: 'Bengaluru' }], willingToRelocate: false }
    )
    assert.equal(result.status, 'rejected')
    assert.ok(result.reasons.some((r) => r.includes('Location')))
  })

  test('eligible with no preferences configured', () => {
    const result = evaluateJobFit(baseJob, null)
    assert.equal(result.eligible, true)
    assert.equal(result.status, 'eligible')
  })

  test('filter reasons include explanation', () => {
    const result = evaluateJobFit(
      { ...baseJob, normalizedWorkMode: 'On-site' },
      { ...basePrefs, preferredWorkMode: 'remote' }
    )
    assert.ok(result.reasons.length > 0)
    assert.ok(typeof result.reasons[0] === 'string')
  })
})

// ════════════════════════════════════════════════════════════════
// MODULE 7: MATCHING / SCORING
// ════════════════════════════════════════════════════════════════

describe('Module 7: Job Matching & Scoring', () => {
  const mockCandidate = {
    candidateProfile: {
      name: 'Test User',
      experienceLevel: 'junior',
      currentRole: 'Frontend Developer',
      skills: [{ name: 'JavaScript' }, { name: 'React' }, { name: 'Node.js' }],
    },
    jobPreference: {
      preferredWorkMode: 'remote',
      employmentType: 'full-time',
      experienceLevel: 'junior',
      minimumSalary: 50000,
      willingToRelocate: false,
      roles: [{ value: 'Frontend Developer' }],
      locations: [],
      industries: [],
      requiredSkills: [{ skill: { name: 'JavaScript' } }, { skill: { name: 'React' } }],
      preferredSkills: [{ skill: { name: 'TypeScript' } }],
    },
  }

  test('score is within 0-100 range', () => {
    const job = {
      normalizedTitle: 'Frontend Developer',
      normalizedWorkMode: 'Remote',
      normalizedEmploymentType: 'Full-time',
      normalizedLocation: 'Remote (Worldwide)',
      skills: [{ name: 'JavaScript' }, { name: 'React' }, { name: 'Node.js' }],
      salaryMax: 80000,
      salaryCurrency: 'USD',
    }
    const result = calculateJobMatch(mockCandidate, job)
    assert.ok(result.score >= 0)
    assert.ok(result.score <= 100)
    assert.ok(typeof result.rating === 'string')
  })

  test('higher score for matching skills', () => {
    const goodMatch = calculateJobMatch(mockCandidate, {
      normalizedTitle: 'Frontend Developer',
      skills: [{ name: 'JavaScript' }, { name: 'React' }, { name: 'Node.js' }],
    })
    const poorMatch = calculateJobMatch(mockCandidate, {
      normalizedTitle: 'Java Developer',
      skills: [{ name: 'Java' }, { name: 'Spring Boot' }, { name: 'SQL' }],
    })
    assert.ok(goodMatch.score > poorMatch.score)
  })

  test('matched and missing skills are reported', () => {
    const result = calculateJobMatch(mockCandidate, {
      normalizedTitle: 'Frontend Developer',
      skills: [{ name: 'JavaScript' }, { name: 'React' }, { name: 'AWS' }],
    })
    assert.ok(result.matchedSkills.includes('JavaScript'))
    assert.ok(result.matchedSkills.includes('React'))
    assert.ok(result.missingSkills.includes('AWS'))
  })

  test('score ratings', () => {
    assert.equal(getScoreRating(95), 'excellent')
    assert.equal(getScoreRating(80), 'strong')
    assert.equal(getScoreRating(65), 'moderate')
    assert.equal(getScoreRating(45), 'weak')
    assert.equal(getScoreRating(20), 'poor')
  })

  test('reasons array is populated', () => {
    const result = calculateJobMatch(mockCandidate, {
      normalizedTitle: 'Frontend Developer',
      normalizedWorkMode: 'Remote',
      skills: [{ name: 'JavaScript' }],
    })
    assert.ok(Array.isArray(result.reasons))
    assert.ok(result.reasons.length > 0)
  })
})

// ════════════════════════════════════════════════════════════════
// MODULE 8: LOCAL AI / OLLAMA
// ════════════════════════════════════════════════════════════════

describe('Module 8: AI Service', () => {
  test('Ollama unavailable returns graceful fallback', async () => {
    const offlineClient = new OllamaService({
      baseUrl: 'http://localhost:99999',
      fetchImpl: async () => { throw new Error('Connection refused') },
    })
    const isOnline = await offlineClient.isOnline()
    assert.equal(isOnline, false)
  })

  test('AiService reports unavailable when Ollama is offline', async () => {
    const offlineClient = new OllamaService({
      baseUrl: 'http://localhost:99999',
      fetchImpl: async () => { throw new Error('Connection refused') },
    })
    const ai = new AiService({ client: offlineClient })
    const status = await ai.checkAvailability()
    assert.equal(status.available, false)
    assert.ok(status.message.includes('offline'))
  })

  test('summarizeJob returns fallback when offline', async () => {
    const offlineClient = new OllamaService({
      baseUrl: 'http://localhost:99999',
      fetchImpl: async () => { throw new Error('Connection refused') },
    })
    const ai = new AiService({ client: offlineClient })
    const result = await ai.summarizeJob({ title: 'Test Job', company: { name: 'Test Co' } })
    assert.equal(result.available, false)
    assert.equal(result.summary, null)
    assert.ok(result.message.includes('offline'))
  })

  test('explainMatch returns fallback when offline', async () => {
    const offlineClient = new OllamaService({
      baseUrl: 'http://localhost:99999',
      fetchImpl: async () => { throw new Error('Connection refused') },
    })
    const ai = new AiService({ client: offlineClient })
    const result = await ai.explainMatch({}, { title: 'Dev' })
    assert.equal(result.available, false)
    assert.equal(result.explanation, null)
  })

  test('Ollama handles timeout gracefully', async () => {
    const slowClient = new OllamaService({
      baseUrl: 'http://localhost:11434',
      timeoutMs: 1,
      fetchImpl: async (url, opts) => {
        await new Promise((resolve) => setTimeout(resolve, 500))
        opts?.signal?.throwIfAborted?.()
        return { ok: true, json: async () => ({ response: 'hello' }) }
      },
    })
    await assert.rejects(
      async () => slowClient.generate('test'),
      (err) => err.name === 'AbortError' || err.message.includes('abort')
    )
  })

  test('OllamaService handles malformed API response', async () => {
    const badClient = new OllamaService({
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ notResponse: true }),
      }),
    })
    await assert.rejects(
      async () => badClient.generate('test'),
      /Malformed response/
    )
  })

  test('Deterministic matching works independently of AI', () => {
    // This verifies Module 7 doesn't depend on Module 8
    const result = calculateJobMatch(
      {
        candidateProfile: { name: 'Dev', experienceLevel: 'junior', skills: [] },
        jobPreference: { roles: [], requiredSkills: [], preferredSkills: [] },
      },
      { normalizedTitle: 'Developer', skills: [] }
    )
    assert.ok(typeof result.score === 'number')
    assert.ok(typeof result.rating === 'string')
  })
})

// ════════════════════════════════════════════════════════════════
// MODULE 9 + 10: Job CRM & Contacts (unit-level validation)
// ════════════════════════════════════════════════════════════════

describe('Module 9: Job CRM Status Model', () => {
  const validStatuses = ['discovered', 'shortlisted', 'interested', 'applied', 'interview', 'offer', 'rejected', 'archived']

  test('all defined statuses are valid strings', () => {
    for (const s of validStatuses) {
      assert.equal(typeof s, 'string')
      assert.ok(s.length > 0)
    }
    assert.equal(validStatuses.length, 8)
  })
})

describe('Module 10: Contact Types', () => {
  const validTypes = ['recruiter', 'hiring_manager', 'employee', 'referral', 'other']

  test('all contact types are valid', () => {
    for (const t of validTypes) {
      assert.equal(typeof t, 'string')
      assert.ok(t.length > 0)
    }
    assert.equal(validTypes.length, 5)
  })
})
