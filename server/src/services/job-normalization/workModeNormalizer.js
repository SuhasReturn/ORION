/**
 * Work mode normalizer.
 * Maps variations into: Remote, Hybrid, On-site, or Unknown.
 */

export function normalizeWorkMode(rawMode = '', rawText = '') {
  const combined = `${rawMode || ''} ${rawText || ''}`.toLowerCase()

  if (/\b(hybrid|flexible\s*location|partial\s*remote)\b/.test(combined)) {
    return 'Hybrid'
  }

  if (/\b(remote|work\s*from\s*home|wfh|100%\s*remote|telecommute|anywhere)\b/.test(combined)) {
    return 'Remote'
  }

  if (/\b(on[\s-]?site|in[\s-]?office|office[\s-]?based|in[\s-]?person)\b/.test(combined)) {
    return 'On-site'
  }

  return 'Unknown'
}
