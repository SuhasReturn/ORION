/**
 * Low-level client for local Ollama instance.
 * Communicates strictly with local offline Ollama (default: http://localhost:11434).
 * Never contacts cloud or paid LLM services.
 */

const DEFAULT_BASE_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'llama3.2'
const DEFAULT_TIMEOUT_MS = 20_000

export class OllamaService {
  constructor({
    baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL,
    model = process.env.OLLAMA_MODEL || DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
  } = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.model = model
    this.timeoutMs = timeoutMs
    this.fetchImpl = fetchImpl
  }

  /**
   * Checks whether the local Ollama instance is online and reachable.
   */
  async isOnline() {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 2000)
      const res = await this.fetchImpl(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      })
      clearTimeout(timer)
      return res.ok
    } catch {
      return false
    }
  }

  /**
   * Generates a text completion using the configured local model.
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  async generate(prompt) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`Ollama returned HTTP ${res.status}`)
      }

      const data = await res.json()
      if (typeof data.response !== 'string') {
        throw new Error('Malformed response from Ollama')
      }

      return data.response.trim()
    } finally {
      clearTimeout(timer)
    }
  }
}

export const ollamaService = new OllamaService()
