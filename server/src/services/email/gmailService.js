import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.resolve(currentDirectory, '../../../../data')
const secureDirectory = path.resolve(dataDirectory, 'secure')
const tokenFilePath = path.resolve(secureDirectory, 'gmail_tokens.enc')

// AES encryption helper for local token protection
const ENCRYPTION_SALT = 'orion-local-secure-salt-v1'
const ENCRYPTION_KEY = scryptSync(process.env.ENCRYPTION_KEY || 'orion-local-app-secret-key-default', ENCRYPTION_SALT, 32)
const ALGORITHM = 'aes-256-gcm'

function encryptToken(tokenData) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const jsonStr = JSON.stringify(tokenData)
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return JSON.stringify({ iv: iv.toString('hex'), authTag, content: encrypted })
}

function decryptToken(encPayloadStr) {
  try {
    const { iv, authTag, content } = JSON.parse(encPayloadStr)
    const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(iv, 'hex'))
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))
    let decrypted = decipher.update(content, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return JSON.parse(decrypted)
  } catch {
    return null
  }
}

// Memory cache for state tokens to prevent CSRF
const activeOAuthStates = new Map()

export class GmailService {
  constructor(options = {}) {
    this.clientId = options.clientId || process.env.GMAIL_CLIENT_ID || null
    this.clientSecret = options.clientSecret || process.env.GMAIL_CLIENT_SECRET || null
    this.redirectUri = options.redirectUri || process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/api/email/callback'
    this.mockTransport = options.mockTransport || null // for unit testing
    this.tokenStorePath = options.tokenStorePath || tokenFilePath
  }

  setMockTransport(transport) {
    this.mockTransport = transport
  }

  isConfigured() {
    return Boolean(this.mockTransport || (this.clientId && this.clientSecret))
  }

  generateAuthUrl() {
    if (!this.clientId && !this.mockTransport) {
      throw new Error('Gmail OAuth is not configured. Missing GMAIL_CLIENT_ID.')
    }
    const state = randomBytes(24).toString('hex')
    activeOAuthStates.set(state, { createdAt: Date.now() })

    // Clean up states older than 15 minutes
    const now = Date.now()
    for (const [key, value] of activeOAuthStates.entries()) {
      if (now - value.createdAt > 15 * 60 * 1000) {
        activeOAuthStates.delete(key)
      }
    }

    if (this.mockTransport) {
      return {
        authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=mock-client-id&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send&state=${state}`,
        state,
      }
    }

    const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.send')
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(this.clientId)}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`
    return { authUrl, state }
  }

  validateState(state) {
    if (!state || typeof state !== 'string') return false
    const entry = activeOAuthStates.get(state)
    if (!entry) return false
    activeOAuthStates.delete(state)
    return Date.now() - entry.createdAt <= 15 * 60 * 1000
  }

  async saveTokens(tokens) {
    await mkdir(path.dirname(this.tokenStorePath), { recursive: true })
    const encrypted = encryptToken(tokens)
    await writeFile(this.tokenStorePath, encrypted, 'utf8')
  }

  async loadTokens() {
    if (!existsSync(this.tokenStorePath)) return null
    try {
      const data = await readFile(this.tokenStorePath, 'utf8')
      return decryptToken(data)
    } catch {
      return null
    }
  }

  async clearTokens() {
    if (existsSync(this.tokenStorePath)) {
      try {
        await unlink(this.tokenStorePath)
      } catch (err) {
        console.error('Failed to unlink token store:', err)
      }
    }
  }

  async getConnectionStatus() {
    const tokens = await this.loadTokens()
    if (!tokens || !tokens.access_token) {
      return {
        configured: this.isConfigured(),
        connected: false,
        email: null,
        scope: null,
      }
    }

    return {
      configured: this.isConfigured(),
      connected: true,
      email: tokens.userEmail || 'connected-user@gmail.com',
      scope: 'https://www.googleapis.com/auth/gmail.send',
      expiresAt: tokens.expiresAt || null,
    }
  }

  async exchangeCodeForTokens(code, state) {
    if (!this.validateState(state)) {
      throw new Error('Invalid or expired OAuth state parameter.')
    }

    if (this.mockTransport) {
      const mockTokens = {
        access_token: 'mock-access-token-' + randomBytes(8).toString('hex'),
        refresh_token: 'mock-refresh-token-' + randomBytes(8).toString('hex'),
        token_type: 'Bearer',
        userEmail: 'user@example.com',
        expiresAt: Date.now() + 3600 * 1000,
      }
      await this.saveTokens(mockTokens)
      return mockTokens
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Token exchange failed: ${err}`)
    }

    const tokenData = await response.json()
    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
      userEmail: 'connected-user@gmail.com', // Will be enriched or kept
    }
    await this.saveTokens(tokens)
    return tokens
  }

  async disconnect() {
    await this.clearTokens()
    return { success: true }
  }

  /**
   * Constructs an RFC 2822 base64url message payload.
   */
  buildRfc2822Message({ to, subject, body, from }) {
    // Sanitize headers to prevent email header injection
    const cleanTo = to.replace(/[\r\n]/g, '').trim()
    const cleanSubject = (subject || '(No Subject)').replace(/[\r\n]/g, '').trim()
    const cleanFrom = from ? from.replace(/[\r\n]/g, '').trim() : ''

    const lines = [
      ...(cleanFrom ? [`From: ${cleanFrom}`] : []),
      `To: ${cleanTo}`,
      `Subject: =?utf-8?B?${Buffer.from(cleanSubject, 'utf8').toString('base64')}?=`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      '',
      body || '',
    ]

    const raw = lines.join('\r\n')
    return Buffer.from(raw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  /**
   * Sends an email via Gmail API with mandatory safeguards.
   */
  async sendEmail({ to, subject, body }) {
    if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
      throw new Error('Valid recipient email address is required.')
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      throw new Error('Email body cannot be empty.')
    }

    // Check mock transport
    if (this.mockTransport) {
      return this.mockTransport.send({ to, subject, body })
    }

    const tokens = await this.loadTokens()
    if (!tokens || !tokens.access_token) {
      throw new Error('Gmail is not connected. Authenticate first.')
    }

    // Format RFC 2822 raw message
    const rawMessage = this.buildRfc2822Message({
      to,
      subject,
      body,
      from: tokens.userEmail,
    })

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Gmail API send failed: ${errorText}`)
    }

    const result = await res.json()
    return {
      messageId: result.id,
      threadId: result.threadId,
    }
  }
}

export const gmailService = new GmailService()
