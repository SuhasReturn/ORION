import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import path from 'node:path'
import { mkdir, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { prisma } from './lib/prisma.js'
import { DiscoveryConfigurationError, discoverJobsForLocalUser, getDiscoveryStatus, listDiscoveredJobs } from './services/job-discovery/discoveryService.js'
import { normalizeAllJobs } from './services/job-normalization/normalizationService.js'
import { filterJobsForLocalUser } from './services/job-filtering/filteringService.js'
import { matchJobsForLocalUser } from './services/job-matching/matchingService.js'
import { aiService } from './services/ai/aiService.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 5000
const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const resumeDirectory = path.resolve(currentDirectory, '../../data/uploads/resumes')
const allowedExperienceLevels = new Set(['student', 'entry', 'junior', 'mid', 'senior'])
const allowedWorkModes = new Set(['remote', 'hybrid', 'on-site', 'any'])
const allowedEmploymentTypes = new Set(['full-time', 'part-time', 'internship', 'contract', 'any'])

const preferenceInclude = {
  roles: { orderBy: { value: 'asc' } },
  locations: { orderBy: { value: 'asc' } },
  industries: { orderBy: { value: 'asc' } },
  requiredSkills: { include: { skill: true }, orderBy: { skill: { name: 'asc' } } },
  preferredSkills: { include: { skill: true }, orderBy: { skill: { name: 'asc' } } },
}

await mkdir(resumeDirectory, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, resumeDirectory),
    filename: (_request, file, callback) => callback(null, `${randomUUID()}.pdf`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const hasPdfExtension = path.extname(file.originalname).toLowerCase() === '.pdf'
    const hasPdfMimeType = !file.mimetype || file.mimetype === 'application/pdf'

    if (!hasPdfExtension || !hasPdfMimeType) {
      return callback(new Error('INVALID_RESUME_FILE_TYPE'))
    }

    callback(null, true)
  },
})

app.use(cors())
app.use(express.json())

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalNumber(value, type) {
  if (value === undefined || value === null || value === '') return null
  const parsed = type === 'int' ? Number.parseInt(value, 10) : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function profileData(body, resumePath) {
  return {
    name: text(body.name),
    email: text(body.email),
    phone: text(body.phone),
    location: text(body.location),
    linkedinUrl: text(body.linkedinUrl),
    githubUrl: text(body.githubUrl),
    portfolioUrl: text(body.portfolioUrl),
    degree: text(body.degree),
    branch: text(body.branch),
    university: text(body.university),
    graduationYear: optionalNumber(body.graduationYear, 'int'),
    cgpa: optionalNumber(body.cgpa, 'float'),
    experienceLevel: text(body.experienceLevel),
    currentRole: text(body.currentRole),
    bio: text(body.bio),
    ...(resumePath ? { resumePath } : {}),
  }
}

function validateProfile(data, requireResume) {
  const errors = {}
  const currentYear = new Date().getFullYear()

  if (!data.name) errors.name = 'Name is required.'
  if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) errors.email = 'A valid email is required.'
  if (!data.location) errors.location = 'Location is required.'
  if (!data.degree) errors.degree = 'Degree is required.'
  if (!data.university) errors.university = 'University is required.'
  if (!Number.isInteger(data.graduationYear) || data.graduationYear < 1900 || data.graduationYear > currentYear + 15) {
    errors.graduationYear = 'Enter a valid graduation year.'
  }
  if (Number.isNaN(data.cgpa) || (data.cgpa !== null && (data.cgpa < 0 || data.cgpa > 10))) {
    errors.cgpa = 'CGPA must be between 0 and 10.'
  }
  if (!data.experienceLevel || !allowedExperienceLevels.has(data.experienceLevel)) {
    errors.experienceLevel = 'Select a valid experience level.'
  }
  if (requireResume && !data.resumePath) errors.resume = 'A PDF resume is required.'

  return errors
}

async function removeUploadedResume(file) {
  if (file?.path) await unlink(file.path).catch(() => {})
}

function publicProfile(profile) {
  return {
    ...profile,
    resumeUploaded: Boolean(profile.resumePath),
  }
}

function normalizeList(value, field, errors, { required = false } = {}) {
  if (!Array.isArray(value)) {
    errors[field] = 'Provide a list of values.'
    return []
  }

  const normalized = []
  const seen = new Set()

  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) {
      errors[field] = 'Values cannot be empty.'
      continue
    }

    const trimmed = item.trim()
    const key = trimmed.toLocaleLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      normalized.push(trimmed)
    }
  }

  if (required && normalized.length === 0 && !errors[field]) {
    errors[field] = 'Add at least one desired role.'
  }

  return normalized
}

function normalizeChoice(value) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''
}

function preferenceData(body) {
  const errors = {}
  const desiredRoles = normalizeList(body.desiredRoles, 'desiredRoles', errors, { required: true })
  const preferredLocations = normalizeList(body.preferredLocations, 'preferredLocations', errors)
  const preferredIndustries = normalizeList(body.preferredIndustries, 'preferredIndustries', errors)
  const requiredSkills = normalizeList(body.requiredSkills, 'requiredSkills', errors)
  const preferredSkills = normalizeList(body.preferredSkills, 'preferredSkills', errors)
  const preferredWorkMode = normalizeChoice(body.preferredWorkMode)
  const employmentType = normalizeChoice(body.employmentType)
  const experienceLevel = normalizeChoice(body.experienceLevel)
  const salary = body.minimumSalary === '' || body.minimumSalary === null || body.minimumSalary === undefined
    ? null
    : Number(body.minimumSalary)
  const relocation = typeof body.willingToRelocate === 'boolean'
    ? body.willingToRelocate
    : typeof body.willingToRelocate === 'string'
      ? body.willingToRelocate.trim().toLocaleLowerCase() === 'yes'
        ? true
        : body.willingToRelocate.trim().toLocaleLowerCase() === 'no'
          ? false
          : null
      : null

  if (!allowedWorkModes.has(preferredWorkMode)) errors.preferredWorkMode = 'Select Remote, Hybrid, On-site, or Any.'
  if (!allowedEmploymentTypes.has(employmentType)) errors.employmentType = 'Select a valid employment type.'
  if (!allowedExperienceLevels.has(experienceLevel)) errors.experienceLevel = 'Select a valid experience level.'
  if (!Number.isInteger(salary) || salary < 0) {
    if (salary !== null) errors.minimumSalary = 'Minimum salary must be a non-negative whole number.'
  }
  if (relocation === null) errors.willingToRelocate = 'Select Yes or No.'

  return {
    errors,
    data: {
      desiredRoles,
      preferredLocations,
      preferredIndustries,
      requiredSkills,
      preferredSkills,
      preferredWorkMode,
      employmentType,
      experienceLevel,
      minimumSalary: salary,
      willingToRelocate: relocation,
    },
  }
}

function preferenceCreateData(data) {
  const skills = (names) => names.map((name) => ({
    skill: { connectOrCreate: { where: { name }, create: { name } } },
  }))

  return {
    preferredWorkMode: data.preferredWorkMode,
    employmentType: data.employmentType,
    experienceLevel: data.experienceLevel,
    minimumSalary: data.minimumSalary,
    willingToRelocate: data.willingToRelocate,
    roles: { create: data.desiredRoles.map((value) => ({ value })) },
    locations: { create: data.preferredLocations.map((value) => ({ value })) },
    industries: { create: data.preferredIndustries.map((value) => ({ value })) },
    requiredSkills: { create: skills(data.requiredSkills) },
    preferredSkills: { create: skills(data.preferredSkills) },
  }
}

function publicPreferences(preference) {
  return {
    id: preference.id,
    desiredRoles: preference.roles.map(({ value }) => value),
    preferredLocations: preference.locations.map(({ value }) => value),
    preferredIndustries: preference.industries.map(({ value }) => value),
    requiredSkills: preference.requiredSkills.map(({ skill }) => skill.name),
    preferredSkills: preference.preferredSkills.map(({ skill }) => skill.name),
    preferredWorkMode: preference.preferredWorkMode,
    employmentType: preference.employmentType,
    experienceLevel: preference.experienceLevel,
    minimumSalary: preference.minimumSalary,
    willingToRelocate: preference.willingToRelocate,
    createdAt: preference.createdAt,
    updatedAt: preference.updatedAt,
  }
}

app.get('/', (_request, response) => {
  response.json({
    success: true,
    message: 'ORION backend is running',
  })
})

app.get('/api/health', (_request, response) => {
  response.json({
    success: true,
    status: 'healthy',
  })
})

app.get('/api/health/database', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`

    response.json({
      success: true,
      status: 'healthy',
      database: 'sqlite',
      message: 'ORION local database connection is healthy',
    })
  } catch (error) {
    console.error('Database health check failed:', error)

    response.status(503).json({
      success: false,
      status: 'unhealthy',
      database: 'sqlite',
      message: 'ORION local database connection could not be established',
    })
  }
})

app.get('/api/profile', async (_request, response) => {
  try {
    const profile = await prisma.candidateProfile.findFirst({
      orderBy: { createdAt: 'asc' },
    })

    if (!profile) {
      return response.status(404).json({ success: false, message: 'No ORION profile has been created yet.' })
    }

    response.json({ success: true, profile: publicProfile(profile) })
  } catch (error) {
    console.error('Profile lookup failed:', error)
    response.status(500).json({ success: false, message: 'Could not load the local profile.' })
  }
})

app.get('/api/preferences', async (_request, response) => {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!user) return response.json({ success: true, configured: false, preferences: null })

    const preferences = await prisma.jobPreference.findUnique({
      where: { userId: user.id },
      include: preferenceInclude,
    })

    response.json({
      success: true,
      configured: Boolean(preferences),
      preferences: preferences ? publicPreferences(preferences) : null,
    })
  } catch (error) {
    console.error('Preference lookup failed:', error)
    response.status(500).json({ success: false, message: 'Could not load local job preferences.' })
  }
})

app.post('/api/preferences', async (request, response) => {
  const { errors, data } = preferenceData(request.body ?? {})
  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ success: false, message: 'Preference validation failed.', errors })
  }

  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!user) {
      return response.status(409).json({ success: false, message: 'Create your candidate profile before configuring job preferences.' })
    }

    const existing = await prisma.jobPreference.findUnique({ where: { userId: user.id } })
    if (existing) {
      return response.status(409).json({ success: false, message: 'Job preferences already exist. Use PUT to update them.' })
    }

    const preferences = await prisma.$transaction((transaction) => transaction.jobPreference.create({
      data: { userId: user.id, ...preferenceCreateData(data) },
      include: preferenceInclude,
    }))

    response.status(201).json({ success: true, preferences: publicPreferences(preferences) })
  } catch (error) {
    console.error('Preference creation failed:', error)
    response.status(500).json({ success: false, message: 'Could not save local job preferences.' })
  }
})

app.put('/api/preferences', async (request, response) => {
  const { errors, data } = preferenceData(request.body ?? {})
  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ success: false, message: 'Preference validation failed.', errors })
  }

  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!user) return response.status(404).json({ success: false, message: 'No local user exists yet.' })

    const existing = await prisma.jobPreference.findUnique({ where: { userId: user.id } })
    if (!existing) return response.status(404).json({ success: false, message: 'Job preferences have not been configured yet.' })

    const createData = preferenceCreateData(data)
    const preferences = await prisma.$transaction((transaction) => transaction.jobPreference.update({
      where: { id: existing.id },
      data: {
        ...createData,
        roles: { deleteMany: {}, create: createData.roles.create },
        locations: { deleteMany: {}, create: createData.locations.create },
        industries: { deleteMany: {}, create: createData.industries.create },
        requiredSkills: { deleteMany: {}, create: createData.requiredSkills.create },
        preferredSkills: { deleteMany: {}, create: createData.preferredSkills.create },
      },
      include: preferenceInclude,
    }))

    response.json({ success: true, preferences: publicPreferences(preferences) })
  } catch (error) {
    console.error('Preference update failed:', error)
    response.status(500).json({ success: false, message: 'Could not update local job preferences.' })
  }
})

app.post('/api/jobs/discover', async (request, response) => {
  try {
    const force = Boolean(request.body?.force)
    const summary = await discoverJobsForLocalUser({ force })
    response.json({ success: true, ...summary })
  } catch (error) {
    if (error instanceof DiscoveryConfigurationError) {
      return response.status(409).json({ success: false, message: error.message })
    }

    console.error('Job discovery failed:', error)
    response.status(500).json({ success: false, message: 'Job discovery could not be completed.' })
  }
})

app.get('/api/jobs', async (request, response) => {
  const page = Math.max(Number.parseInt(request.query.page, 10) || 1, 1)
  const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 20, 1), 100)
  const savedOnly = request.query.saved === 'true'
  const statusFilter = text(request.query.status)
  const filterStatusParam = text(request.query.filterStatus)
  const sortBy = request.query.sort === 'score' ? 'score' : 'date'

  try {
    const where = {}
    if (savedOnly) where.isSaved = true
    if (statusFilter) where.status = statusFilter
    if (filterStatusParam) where.filterStatus = filterStatusParam

    const skip = (page - 1) * limit
    const orderBy = sortBy === 'score'
      ? [{ matchScore: 'desc' }, { discoveredAt: 'desc' }]
      : [{ discoveredAt: 'desc' }, { createdAt: 'desc' }]

    const [jobs, total] = await prisma.$transaction([
      prisma.job.findMany({
        where,
        include: { company: true, skills: true },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
    ])

    response.json({ success: true, jobs, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Job listing failed:', error)
    response.status(500).json({ success: false, message: 'Could not load discovered jobs.' })
  }
})

app.get('/api/jobs/discovery/status', (_request, response) => {
  response.json({ success: true, status: getDiscoveryStatus() })
})

// ── MODULE 5: Normalization + Deduplication ──
app.post('/api/jobs/normalize', async (_request, response) => {
  try {
    const result = await normalizeAllJobs()
    response.json({ success: true, ...result })
  } catch (error) {
    console.error('Normalization failed:', error)
    response.status(500).json({ success: false, message: 'Job normalization could not be completed.' })
  }
})

// ── MODULE 6: Filtering ──
app.post('/api/jobs/filter', async (_request, response) => {
  try {
    const result = await filterJobsForLocalUser()
    response.json({ success: true, ...result })
  } catch (error) {
    console.error('Filtering failed:', error)
    response.status(500).json({ success: false, message: error.message || 'Job filtering could not be completed.' })
  }
})

// ── MODULE 7: Matching / Scoring ──
app.post('/api/jobs/match', async (_request, response) => {
  try {
    const result = await matchJobsForLocalUser()
    response.json({ success: true, ...result })
  } catch (error) {
    console.error('Matching failed:', error)
    response.status(500).json({ success: false, message: error.message || 'Job matching could not be completed.' })
  }
})

// ── MODULE 8: Local AI / Ollama ──
app.get('/api/ai/status', async (_request, response) => {
  const status = await aiService.checkAvailability()
  response.json({ success: true, ...status })
})

app.post('/api/jobs/:id/ai-summary', async (request, response) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: request.params.id },
      include: { company: true, skills: true },
    })
    if (!job) return response.status(404).json({ success: false, message: 'Job not found.' })

    const result = await aiService.summarizeJob(job)
    if (result.summary) {
      await prisma.job.update({
        where: { id: job.id },
        data: { aiSummary: result.summary, aiProcessedAt: new Date() },
      })
    }
    response.json({ success: true, ...result })
  } catch (error) {
    console.error('AI summary failed:', error)
    response.status(500).json({ success: false, message: 'AI summary generation failed.' })
  }
})

// ── MODULE 9: Job CRM ──
app.get('/api/jobs/:id', async (request, response) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: request.params.id },
      include: { company: true, skills: true, contacts: true },
    })
    if (!job) return response.status(404).json({ success: false, message: 'Job not found.' })

    // Parse JSON-stored fields for frontend
    const enriched = {
      ...job,
      filterReasons: job.filterReasons ? JSON.parse(job.filterReasons) : [],
      matchReasons: job.matchReasons ? JSON.parse(job.matchReasons) : [],
      matchedSkills: job.matchedSkills ? JSON.parse(job.matchedSkills) : [],
      missingSkills: job.missingSkills ? JSON.parse(job.missingSkills) : [],
    }
    response.json({ success: true, job: enriched })
  } catch (error) {
    console.error('Job detail failed:', error)
    response.status(500).json({ success: false, message: 'Could not load job details.' })
  }
})

app.post('/api/jobs/:id/save', async (request, response) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: request.params.id } })
    if (!job) return response.status(404).json({ success: false, message: 'Job not found.' })

    const updated = await prisma.job.update({
      where: { id: request.params.id },
      data: { isSaved: true },
    })
    response.json({ success: true, job: updated })
  } catch (error) {
    console.error('Job save failed:', error)
    response.status(500).json({ success: false, message: 'Could not save the job.' })
  }
})

app.delete('/api/jobs/:id/save', async (request, response) => {
  try {
    const updated = await prisma.job.update({
      where: { id: request.params.id },
      data: { isSaved: false },
    })
    response.json({ success: true, job: updated })
  } catch (error) {
    console.error('Job unsave failed:', error)
    response.status(500).json({ success: false, message: 'Could not unsave the job.' })
  }
})

app.put('/api/jobs/:id/status', async (request, response) => {
  const validStatuses = ['discovered', 'shortlisted', 'interested', 'applied', 'interview', 'offer', 'rejected', 'archived']
  const newStatus = text(request.body?.status)
  if (!newStatus || !validStatuses.includes(newStatus)) {
    return response.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
  }

  try {
    const updated = await prisma.job.update({
      where: { id: request.params.id },
      data: { status: newStatus },
    })
    response.json({ success: true, job: updated })
  } catch (error) {
    console.error('Status update failed:', error)
    response.status(500).json({ success: false, message: 'Could not update job status.' })
  }
})

app.post('/api/jobs/:id/notes', async (request, response) => {
  const noteContent = typeof request.body?.notes === 'string' ? request.body.notes : null

  try {
    const updated = await prisma.job.update({
      where: { id: request.params.id },
      data: { notes: noteContent },
    })
    response.json({ success: true, job: updated })
  } catch (error) {
    console.error('Notes update failed:', error)
    response.status(500).json({ success: false, message: 'Could not update job notes.' })
  }
})

// ── MODULE 10: Contact Management ──
const allowedContactTypes = new Set(['recruiter', 'hiring_manager', 'employee', 'referral', 'other'])

function validateContact(body) {
  const errors = {}
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) errors.name = 'Contact name is required.'
  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) errors.email = 'Enter a valid email address.'
  if (body.profileUrl && !/^https?:\/\//.test(body.profileUrl)) errors.profileUrl = 'URL must start with http:// or https://'
  if (body.type && !allowedContactTypes.has(body.type)) errors.type = `Type must be one of: ${[...allowedContactTypes].join(', ')}`
  return errors
}

function contactData(body) {
  return {
    name: body.name.trim(),
    email: text(body.email),
    phone: text(body.phone),
    role: text(body.role),
    type: body.type && allowedContactTypes.has(body.type) ? body.type : 'other',
    profileUrl: text(body.profileUrl),
    notes: text(body.notes),
    companyId: text(body.companyId),
    jobId: text(body.jobId),
  }
}

app.get('/api/contacts', async (request, response) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: { company: true, job: true },
      orderBy: { createdAt: 'desc' },
    })
    response.json({ success: true, contacts })
  } catch (error) {
    console.error('Contact listing failed:', error)
    response.status(500).json({ success: false, message: 'Could not load contacts.' })
  }
})

app.get('/api/contacts/:id', async (request, response) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: request.params.id },
      include: { company: true, job: true },
    })
    if (!contact) return response.status(404).json({ success: false, message: 'Contact not found.' })
    response.json({ success: true, contact })
  } catch (error) {
    console.error('Contact lookup failed:', error)
    response.status(500).json({ success: false, message: 'Could not load contact.' })
  }
})

app.post('/api/contacts', async (request, response) => {
  const errors = validateContact(request.body ?? {})
  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ success: false, message: 'Contact validation failed.', errors })
  }

  try {
    let user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!user) return response.status(409).json({ success: false, message: 'Create a candidate profile first.' })

    const data = contactData(request.body)
    const contact = await prisma.contact.create({
      data: { ...data, userId: user.id },
      include: { company: true, job: true },
    })
    response.status(201).json({ success: true, contact })
  } catch (error) {
    console.error('Contact creation failed:', error)
    response.status(500).json({ success: false, message: 'Could not create contact.' })
  }
})

app.put('/api/contacts/:id', async (request, response) => {
  const errors = validateContact(request.body ?? {})
  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ success: false, message: 'Contact validation failed.', errors })
  }

  try {
    const existing = await prisma.contact.findUnique({ where: { id: request.params.id } })
    if (!existing) return response.status(404).json({ success: false, message: 'Contact not found.' })

    const data = contactData(request.body)
    const contact = await prisma.contact.update({
      where: { id: request.params.id },
      data,
      include: { company: true, job: true },
    })
    response.json({ success: true, contact })
  } catch (error) {
    console.error('Contact update failed:', error)
    response.status(500).json({ success: false, message: 'Could not update contact.' })
  }
})

app.delete('/api/contacts/:id', async (request, response) => {
  try {
    const existing = await prisma.contact.findUnique({ where: { id: request.params.id } })
    if (!existing) return response.status(404).json({ success: false, message: 'Contact not found.' })

    await prisma.contact.delete({ where: { id: request.params.id } })
    response.json({ success: true, message: 'Contact deleted.' })
  } catch (error) {
    console.error('Contact deletion failed:', error)
    response.status(500).json({ success: false, message: 'Could not delete contact.' })
  }
})


app.post('/api/profile', upload.single('resume'), async (request, response) => {
  const resumePath = request.file ? path.posix.join('uploads/resumes', request.file.filename) : null
  const data = profileData(request.body, resumePath)
  const errors = validateProfile(data, true)

  if (Object.keys(errors).length > 0) {
    await removeUploadedResume(request.file)
    return response.status(400).json({ success: false, message: 'Profile validation failed.', errors })
  }

  try {
    const existingProfile = await prisma.candidateProfile.findFirst()
    if (existingProfile) {
      await removeUploadedResume(request.file)
      return response.status(409).json({ success: false, message: 'An ORION profile already exists. Use PUT to update it.' })
    }

    let user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!user) user = await prisma.user.create({ data: {} })

    const profile = await prisma.candidateProfile.create({ data: { ...data, userId: user.id } })
    response.status(201).json({ success: true, profile: publicProfile(profile) })
  } catch (error) {
    await removeUploadedResume(request.file)
    console.error('Profile creation failed:', error)
    response.status(500).json({ success: false, message: 'Could not save the local profile.' })
  }
})

app.put('/api/profile', upload.single('resume'), async (request, response) => {
  const resumePath = request.file ? path.posix.join('uploads/resumes', request.file.filename) : null
  const data = profileData(request.body, resumePath)
  const errors = validateProfile({ ...data, resumePath: data.resumePath ?? 'existing' }, false)

  if (Object.keys(errors).length > 0) {
    await removeUploadedResume(request.file)
    return response.status(400).json({ success: false, message: 'Profile validation failed.', errors })
  }

  try {
    const existingProfile = await prisma.candidateProfile.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!existingProfile) {
      await removeUploadedResume(request.file)
      return response.status(404).json({ success: false, message: 'No ORION profile exists yet.' })
    }

    const profile = await prisma.candidateProfile.update({
      where: { id: existingProfile.id },
      data,
    })

    response.json({ success: true, profile: publicProfile(profile) })
  } catch (error) {
    await removeUploadedResume(request.file)
    console.error('Profile update failed:', error)
    response.status(500).json({ success: false, message: 'Could not update the local profile.' })
  }
})

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    return response.status(400).json({ success: false, message: 'Resume upload failed. PDFs must be 10 MB or smaller.' })
  }

  if (error.message === 'INVALID_RESUME_FILE_TYPE') {
    return response.status(400).json({ success: false, message: 'Only PDF resume files are allowed.' })
  }

  console.error('Request failed:', error)
  response.status(500).json({ success: false, message: 'The local request could not be completed.' })
})

export { app }

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isDirectRun) {
  app.listen(port, () => {
    console.log(`ORION backend is running at http://localhost:${port}`)
  })
}

