import { ollamaService } from './ollamaService.js'

/**
 * High-level AI service.
 * Provides offline job summarization, match explanation, and skill gap analysis.
 * Safely falls back if local Ollama is not installed or running.
 */
export class AiService {
  constructor({ client = ollamaService } = {}) {
    this.client = client
  }

  /**
   * Health check to see if AI features are currently available locally.
   */
  async checkAvailability() {
    const isOnline = await this.client.isOnline()
    return {
      available: isOnline,
      provider: 'ollama',
      model: this.client.model,
      baseUrl: this.client.baseUrl,
      message: isOnline
        ? `Local Ollama is ready using model ${this.client.model}`
        : 'Local Ollama is offline or not installed. Deterministic matching remains active.',
    }
  }

  /**
   * Generates a concise 2-3 sentence overview of the role, requirements, and scope.
   */
  async summarizeJob(job) {
    const isOnline = await this.client.isOnline()
    if (!isOnline) {
      return {
        available: false,
        summary: null,
        message: 'Local Ollama is offline. Summary could not be generated.',
      }
    }

    const company = job.company?.name || job.normalizedCompany || 'the hiring company'
    const title = job.normalizedTitle || job.title
    const snippet = (job.description || '').slice(0, 1500)

    const prompt = `You are an AI career assistant. Write a concise, 2-to-3 sentence executive summary of this job opening for a candidate. Focus on core responsibilities, key tech stack, and what makes the opportunity notable.

Job Title: ${title}
Company: ${company}
Location: ${job.normalizedLocation || job.location || 'Remote'}
Work Mode: ${job.normalizedWorkMode || 'Flexible'}

Job Description Snippet:
${snippet}

Summary:`

    try {
      const summary = await this.client.generate(prompt)
      return {
        available: true,
        summary,
      }
    } catch (err) {
      return {
        available: false,
        summary: null,
        message: `AI generation failed: ${err.message}`,
      }
    }
  }

  /**
   * Explains why the job matches the candidate profile and how to address skill gaps.
   */
  async explainMatch(candidate, job) {
    const isOnline = await this.client.isOnline()
    if (!isOnline) {
      return {
        available: false,
        explanation: null,
        message: 'Local Ollama is offline. Explanation unavailable.',
      }
    }

    const profile = candidate?.candidateProfile || {}
    const candidateName = profile.name || 'Candidate'
    const title = job.normalizedTitle || job.title
    const company = job.company?.name || job.normalizedCompany || 'the company'

    const matched = job.matchedSkills ? JSON.parse(job.matchedSkills) : []
    const missing = job.missingSkills ? JSON.parse(job.missingSkills) : []

    const prompt = `You are a career coach. In 2 concise paragraphs:
1. Explain why ${candidateName} is a strong match for ${title} at ${company} based on matching skills: ${matched.join(', ') || 'general alignment'}.
2. Offer constructive tips on how to address missing requirements: ${missing.join(', ') || 'none identified'}.

Tone: Encouraging, specific, actionable.

Advice:`

    try {
      const explanation = await this.client.generate(prompt)
      return {
        available: true,
        explanation,
      }
    } catch (err) {
      return {
        available: false,
        explanation: null,
        message: `AI generation failed: ${err.message}`,
      }
    }
  }
}

export const aiService = new AiService()
