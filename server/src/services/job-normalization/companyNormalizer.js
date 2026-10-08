/**
 * Company name normalizer.
 * Strips whitespace, legal suffixes (LLC, Inc, Ltd, Pvt Ltd, etc.) and punctuation
 * to enable cross-source deduplication without over-merging.
 */

const LEGAL_SUFFIXES = [
  /\b(pvt(\.|\b)\s*ltd(\.|\b)|private\s*limited)\b/i,
  /\b(inc(\.|\b)|incorporated)\b/i,
  /\b(llc(\.|\b)|l\.l\.c\.)\b/i,
  /\b(ltd(\.|\b)|limited)\b/i,
  /\b(pvt(\.|\b))\b/i,
  /\b(corp(\.|\b)|corporation)\b/i,
  /\b(co(\.|\b)|company)\b/i,
  /\b(gmbh|ag|sa|srl|bv)\b/i,
]

export function normalizeCompany(rawName = '') {
  if (!rawName || typeof rawName !== 'string') return 'Unknown Company'

  let cleaned = rawName.trim()

  for (const suffix of LEGAL_SUFFIXES) {
    cleaned = cleaned.replace(suffix, '')
  }

  // Remove trailing commas, dots, dashes, and extra whitespace
  cleaned = cleaned.trim().replace(/[,.-]+$/, '').trim()

  // Standardize multiple whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')

  if (!cleaned) return rawName.trim()

  // Acronym preservation (e.g., TCS, IBM, AWS) and proper title-casing
  if (cleaned === cleaned.toUpperCase()) {
    if (cleaned.length > 4 || cleaned.includes(' ')) {
      cleaned = cleaned
        .split(' ')
        .map((word) => (word.length <= 3 ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
        .join(' ')
    }
  } else if (cleaned === cleaned.toLowerCase()) {
    cleaned = cleaned
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  return cleaned
}
