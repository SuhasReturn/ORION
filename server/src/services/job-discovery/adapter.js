/**
 * Common RawJob interface:
 * {
 *   source: string,          // Name of the source (e.g. 'remotive')
 *   externalId: string,      // Unique identifier within the source
 *   title: string,           // Job title
 *   companyName: string,     // Company name
 *   location?: string|null,  // Job location / geographic scope
 *   workMode?: string|null,  // 'remote', 'hybrid', 'on-site', etc.
 *   employmentType?: string|null, // 'full-time', 'part-time', 'contract', etc.
 *   description?: string|null,    // Job description text/HTML
 *   url: string,             // Direct URL to original job posting
 *   salaryText?: string|null,// Formatted salary text if provided
 *   postedAt?: Date|null,    // Publication timestamp
 *   discoveredAt?: Date,     // Discovery timestamp
 * }
 */

export class JobSourceAdapter {
  /**
   * @param {string} name - Unique source name
   */
  constructor(name) {
    if (!name || typeof name !== 'string') {
      throw new Error('JobSourceAdapter requires a non-empty name string.')
    }
    this.name = name.trim().toLowerCase()
  }

  /**
   * Discover jobs matching the user's job preferences.
   * @param {object} preferences - User's JobPreference record with roles, locations, etc.
   * @param {object} [options] - Optional runtime settings (limit, fetchImpl, bypassInterval, etc.)
   * @returns {Promise<Array<object>>} - List of RawJob objects conforming to common format
   */
  async discoverJobs(_preferences, _options = {}) {
    throw new Error(`discoverJobs must be implemented by adapter ${this.name}.`)
  }
}

/**
 * Validates that a raw job conforms to the required common format.
 * @param {object} rawJob
 * @returns {boolean}
 */
export function validateRawJob(rawJob) {
  if (!rawJob || typeof rawJob !== 'object') return false
  if (!rawJob.source || typeof rawJob.source !== 'string') return false
  if (!rawJob.externalId || typeof String(rawJob.externalId) !== 'string') return false
  if (!rawJob.title || typeof rawJob.title !== 'string') return false
  if (!rawJob.url || typeof rawJob.url !== 'string') return false
  return true
}
