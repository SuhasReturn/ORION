/**
 * Deterministic template-based message generation.
 * Produces professional outreach drafts using verified candidate/job/contact data.
 * Never fabricates achievements, connections, or qualifications.
 */

const MESSAGE_TYPES = new Set([
  'recruiter_outreach',
  'hiring_manager_outreach',
  'employee_networking',
  'referral_request',
  'application_interest',
  'follow_up',
])

const TONES = new Set(['professional', 'friendly', 'concise'])
const LENGTHS = new Set(['short', 'medium', 'detailed'])
const CHANNELS = new Set(['email', 'linkedin'])

/**
 * Builds a deterministic outreach message from verified data.
 */
export function generateTemplateMessage({
  messageType,
  candidate,
  job,
  contact,
  tone = 'professional',
  lengthPreference = 'medium',
  userContext = '',
  previousOutreach = null,
}) {
  const candidateName = candidate?.name || 'there'
  const contactName = contact?.name || 'Hiring Team'
  const contactRole = contact?.role || contact?.type || ''
  const jobTitle = job?.normalizedTitle || job?.title || 'the open position'
  const companyName = job?.company?.name || job?.normalizedCompany || contact?.company?.name || 'your company'
  const matchedSkills = job?.matchedSkills ? safeParseJSON(job.matchedSkills) : []
  const candidateSkills = candidate?.skills?.map(s => s.name) || []
  const relevantSkills = matchedSkills.length > 0 ? matchedSkills : candidateSkills.slice(0, 5)
  const skillStr = relevantSkills.length > 0 ? relevantSkills.join(', ') : ''

  const greeting = tone === 'concise'
    ? `Hi ${contactName},`
    : tone === 'friendly'
      ? `Hi ${contactName},\n\nHope you're doing well!`
      : `Dear ${contactName},`

  const signoff = tone === 'concise'
    ? `Best,\n${candidateName}`
    : tone === 'friendly'
      ? `Looking forward to hearing from you!\n\nBest regards,\n${candidateName}`
      : `Thank you for your time and consideration.\n\nBest regards,\n${candidateName}`

  let body = ''
  let subject = ''

  switch (messageType) {
    case 'recruiter_outreach':
      subject = `Interest in ${jobTitle} at ${companyName}`
      body = buildRecruiterOutreach({ candidateName, jobTitle, companyName, skillStr, tone, lengthPreference, userContext })
      break

    case 'hiring_manager_outreach':
      subject = `Application for ${jobTitle} — ${candidateName}`
      body = buildHiringManagerOutreach({ candidateName, jobTitle, companyName, skillStr, contactName, tone, lengthPreference, userContext })
      break

    case 'employee_networking':
      subject = `Connecting about opportunities at ${companyName}`
      body = buildEmployeeNetworking({ candidateName, companyName, contactName, contactRole, skillStr, tone, lengthPreference, userContext })
      break

    case 'referral_request':
      subject = `Referral request for ${jobTitle} at ${companyName}`
      body = buildReferralRequest({ candidateName, jobTitle, companyName, contactName, skillStr, tone, lengthPreference, userContext })
      break

    case 'application_interest':
      subject = `Following up on ${jobTitle} application`
      body = buildApplicationInterest({ candidateName, jobTitle, companyName, skillStr, tone, lengthPreference, userContext })
      break

    case 'follow_up':
      subject = `Following up — ${jobTitle} at ${companyName}`
      body = buildFollowUpDraft({ candidateName, jobTitle, companyName, contactName, previousOutreach, tone, lengthPreference, userContext })
      break

    default:
      subject = `Reaching out — ${candidateName}`
      body = `I'm reaching out regarding opportunities at ${companyName}.${skillStr ? ` My background includes ${skillStr}.` : ''}`
  }

  const message = `${greeting}\n\n${body}\n\n${signoff}`

  return { subject, message, generationSource: 'template' }
}

function buildRecruiterOutreach({ candidateName, jobTitle, companyName, skillStr, tone, lengthPreference, userContext }) {
  const intro = `I came across the ${jobTitle} role at ${companyName} and wanted to express my interest.`
  const skills = skillStr ? `My experience includes ${skillStr}, which I believe aligns well with the requirements.` : ''
  const context = userContext ? `\n\n${userContext}` : ''
  const closing = 'I would welcome the opportunity to discuss how my background could contribute to the team.'

  if (lengthPreference === 'short') return `${intro}${skillStr ? ' ' + skills : ''}${context}`
  if (lengthPreference === 'detailed') return `${intro}\n\n${skills}\n\nI'm particularly drawn to ${companyName}'s work and believe my background would be a strong fit for this role.${context}\n\n${closing}`
  return `${intro}${skills ? '\n\n' + skills : ''}${context}\n\n${closing}`
}

function buildHiringManagerOutreach({ candidateName, jobTitle, companyName, skillStr, contactName, tone, lengthPreference, userContext }) {
  const intro = `I'm writing to express my strong interest in the ${jobTitle} position at ${companyName}.`
  const skills = skillStr ? `My technical background includes ${skillStr}, and I'm eager to bring these skills to your team.` : ''
  const context = userContext ? `\n\n${userContext}` : ''
  const closing = 'I would appreciate the chance to discuss how I can contribute to your team\'s goals.'

  if (lengthPreference === 'short') return `${intro}${skillStr ? ' ' + skills : ''}${context}`
  return `${intro}${skills ? '\n\n' + skills : ''}${context}\n\n${closing}`
}

function buildEmployeeNetworking({ candidateName, companyName, contactName, contactRole, skillStr, tone, lengthPreference, userContext }) {
  const intro = `I noticed your profile${contactRole ? ` as ${contactRole}` : ''} at ${companyName} and would love to connect.`
  const skills = skillStr ? `I work with ${skillStr} and am interested in learning more about the engineering culture at ${companyName}.` : ''
  const context = userContext ? `\n\n${userContext}` : ''
  const closing = 'Would you be open to a brief chat about your experience at the company?'

  if (lengthPreference === 'short') return `${intro}${context}\n\n${closing}`
  return `${intro}${skills ? '\n\n' + skills : ''}${context}\n\n${closing}`
}

function buildReferralRequest({ candidateName, jobTitle, companyName, contactName, skillStr, tone, lengthPreference, userContext }) {
  const intro = `I'm interested in the ${jobTitle} role at ${companyName} and was hoping you might be able to provide a referral.`
  const skills = skillStr ? `My background in ${skillStr} aligns well with the role requirements.` : ''
  const context = userContext ? `\n\n${userContext}` : ''
  const closing = 'I completely understand if this isn\'t possible, and I appreciate your time regardless.'

  if (lengthPreference === 'short') return `${intro}${context}`
  return `${intro}${skills ? '\n\n' + skills : ''}${context}\n\n${closing}`
}

function buildApplicationInterest({ candidateName, jobTitle, companyName, skillStr, tone, lengthPreference, userContext }) {
  const intro = `I recently applied for the ${jobTitle} position at ${companyName} and wanted to reiterate my enthusiasm for the opportunity.`
  const skills = skillStr ? `My experience with ${skillStr} makes me confident I can contribute meaningfully to the team.` : ''
  const context = userContext ? `\n\n${userContext}` : ''

  if (lengthPreference === 'short') return `${intro}${context}`
  return `${intro}${skills ? '\n\n' + skills : ''}${context}`
}

function buildFollowUpDraft({ candidateName, jobTitle, companyName, contactName, previousOutreach, tone, lengthPreference, userContext }) {
  const timeSince = previousOutreach?.sentAt
    ? `since my ${previousOutreach.messageType?.replace(/_/g, ' ') || 'previous message'}`
    : 'since my last message'

  const intro = `I wanted to follow up on my previous outreach regarding the ${jobTitle} role at ${companyName}.`
  const context = userContext ? `\n\n${userContext}` : ''
  const closing = `I remain very interested in this opportunity and would appreciate any update you might have.`

  if (lengthPreference === 'short') return `${intro}${context}`
  return `${intro}${context}\n\n${closing}`
}

function safeParseJSON(str) {
  try { return JSON.parse(str) } catch { return [] }
}

export { MESSAGE_TYPES, TONES, LENGTHS, CHANNELS }
