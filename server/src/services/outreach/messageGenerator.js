/**
 * AI-powered message generation service.
 * Uses Ollama locally when available, falls back to deterministic templates.
 * Never fabricates facts, achievements, or connections.
 */
import { aiService } from '../ai/aiService.js'
import { generateTemplateMessage, MESSAGE_TYPES, TONES, LENGTHS, CHANNELS } from './messageTemplates.js'

/**
 * Generates an outreach message draft.
 * @param {object} params
 * @returns {{ subject: string, message: string, generationSource: 'ollama'|'template' }}
 */
export async function generateOutreachMessage({
  messageType,
  candidate,
  job,
  contact,
  tone = 'professional',
  lengthPreference = 'medium',
  channel = 'email',
  userContext = '',
  previousOutreach = null,
}) {
  // Validate inputs
  if (!MESSAGE_TYPES.has(messageType)) {
    throw new Error(`Invalid message type: ${messageType}`)
  }
  if (!TONES.has(tone)) {
    throw new Error(`Invalid tone: ${tone}`)
  }
  if (!LENGTHS.has(lengthPreference)) {
    throw new Error(`Invalid length preference: ${lengthPreference}`)
  }

  // Try AI generation first
  const aiAvailability = await aiService.checkAvailability()

  if (aiAvailability.available) {
    try {
      const aiResult = await generateWithAI({
        messageType, candidate, job, contact,
        tone, lengthPreference, channel, userContext, previousOutreach,
      })

      if (aiResult && aiResult.message && aiResult.message.length > 20) {
        // Sanitize AI output — strip any fabricated claims patterns
        const sanitized = sanitizeAIOutput(aiResult.message)
        return {
          subject: aiResult.subject || generateTemplateMessage({ messageType, candidate, job, contact, tone, lengthPreference, userContext, previousOutreach }).subject,
          message: sanitized,
          generationSource: 'ollama',
        }
      }
    } catch (err) {
      console.warn('AI message generation failed, falling back to template:', err.message)
    }
  }

  // Deterministic fallback
  return generateTemplateMessage({
    messageType, candidate, job, contact,
    tone, lengthPreference, userContext, previousOutreach,
  })
}

async function generateWithAI({
  messageType, candidate, job, contact,
  tone, lengthPreference, channel, userContext, previousOutreach,
}) {
  const candidateName = candidate?.name || 'the candidate'
  const contactName = contact?.name || 'the recipient'
  const contactRole = contact?.role || contact?.type || ''
  const jobTitle = job?.normalizedTitle || job?.title || 'the position'
  const companyName = job?.company?.name || job?.normalizedCompany || contact?.company?.name || 'the company'
  const matchedSkills = job?.matchedSkills ? safeParseJSON(job.matchedSkills) : []
  const candidateSkills = candidate?.skills?.map(s => s.name) || []
  const relevantSkills = matchedSkills.length > 0 ? matchedSkills : candidateSkills.slice(0, 5)

  const lengthGuide = lengthPreference === 'short' ? '2-3 sentences' : lengthPreference === 'detailed' ? '3-4 paragraphs' : '2-3 short paragraphs'
  const channelNote = channel === 'linkedin' ? 'Keep it concise as this is for a LinkedIn message.' : ''

  const prompt = `You are a career communication assistant. Write a ${tone} ${messageType.replace(/_/g, ' ')} message.

RULES:
- Do NOT invent achievements, qualifications, connections, or referrals
- Use ONLY the verified information provided below
- If information is missing, omit it — do NOT fill gaps with fabricated claims
- Keep the tone ${tone}
- Target length: ${lengthGuide}
${channelNote}

VERIFIED INFORMATION:
- Candidate name: ${candidateName}
- Recipient: ${contactName}${contactRole ? ` (${contactRole})` : ''}
- Job title: ${jobTitle}
- Company: ${companyName}
- Relevant skills: ${relevantSkills.join(', ') || 'not specified'}
${userContext ? `- Additional context from user: ${userContext}` : ''}
${previousOutreach ? `- This is a follow-up to a previous ${previousOutreach.messageType?.replace(/_/g, ' ') || 'message'}` : ''}

Write only the message body (no subject line, no greeting, no sign-off — those will be added separately).
Do NOT add "[Your Name]" or similar placeholders.

Message:`

  const result = await aiService.client.generate(prompt)
  if (!result || typeof result !== 'string') return null

  // Generate subject from template logic
  const templateResult = generateTemplateMessage({
    messageType, candidate, job, contact, tone, lengthPreference, userContext, previousOutreach,
  })

  return {
    subject: templateResult.subject,
    message: result.trim(),
  }
}

/**
 * Removes obvious fabrication patterns from AI output.
 */
function sanitizeAIOutput(text) {
  // Strip common AI hallucination patterns
  let cleaned = text
    .replace(/\[Your Name\]/gi, '')
    .replace(/\[Company Name\]/gi, '')
    .replace(/\[Your.*?\]/gi, '')
    .replace(/\{.*?\}/g, '')
    .trim()

  // Cap length at ~2000 chars for safety
  if (cleaned.length > 2000) {
    cleaned = cleaned.slice(0, 2000) + '...'
  }

  return cleaned
}

function safeParseJSON(str) {
  try { return JSON.parse(str) } catch { return [] }
}

export { MESSAGE_TYPES, TONES, LENGTHS, CHANNELS }
