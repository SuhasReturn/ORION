/**
 * Employment type normalizer.
 * Maps variations into: Full-time, Part-time, Internship, Contract, Temporary, or Unknown.
 */

export function normalizeEmploymentType(rawType = '', rawText = '') {
  const combined = `${rawType || ''} ${rawText || ''}`.toLowerCase()

  if (/\b(intern|internship|trainee|co[\s-]?op)\b/.test(combined)) {
    return 'Internship'
  }

  if (/\b(contract|contractor|freelance|consultant|c2c|w2)\b/.test(combined)) {
    return 'Contract'
  }

  if (/\b(part[\s-]?time|half[\s-]?day)\b/.test(combined)) {
    return 'Part-time'
  }

  if (/\b(temp|temporary|seasonal)\b/.test(combined)) {
    return 'Temporary'
  }

  if (/\b(full[\s-]?time|permanent|direct[\s-]?hire|f[\s/]?t)\b/.test(combined)) {
    return 'Full-time'
  }

  return 'Unknown'
}
