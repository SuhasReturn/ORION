/**
 * Title normalizer with seniority preservation.
 * Normalizes variations (e.g. Front-End, Frontend Engineer -> Frontend Developer)
 * while retaining seniority (Junior, Senior, Lead, Principal, etc.)
 */

const SENIORITY_PATTERNS = [
  { match: /\b(intern|internship|trainee)\b/i, label: 'Intern' },
  { match: /\b(junior|jr\.?|associate|entry[\s-]level)\b/i, label: 'Junior' },
  { match: /\b(senior|sr\.?)\b/i, label: 'Senior' },
  { match: /\b(lead|tech[\s-]lead|team[\s-]lead)\b/i, label: 'Lead' },
  { match: /\b(staff)\b/i, label: 'Staff' },
  { match: /\b(principal)\b/i, label: 'Principal' },
  { match: /\b(head[\s-]of|director|vp|vice[\s-]president)\b/i, label: 'Head of' },
]

const ROLE_PATTERNS = [
  {
    match: /\b(front[\s-]?end|ui|client[\s-]side)\s*(developer|engineer|web\s*developer)?\b/i,
    label: 'Frontend Developer',
  },
  {
    match: /\b(back[\s-]?end|server[\s-]side)\s*(developer|engineer)?\b/i,
    label: 'Backend Developer',
  },
  {
    match: /\b(full[\s-]?stack)\s*(developer|engineer)?\b/i,
    label: 'Full Stack Developer',
  },
  {
    match: /\b(software\s*(engineer|developer)|sde|swe)\b/i,
    label: 'Software Engineer',
  },
  {
    match: /\b(devops|platform|infrastructure|site\s*reliability|sre)\s*(engineer)?\b/i,
    label: 'DevOps Engineer',
  },
  {
    match: /\b(cloud)\s*(engineer|architect|developer)\b/i,
    label: 'Cloud Engineer',
  },
  {
    match: /\b(data\s*scientist|machine\s*learning|ml|ai)\s*(engineer|scientist)?\b/i,
    label: 'Data Scientist',
  },
  {
    match: /\b(data\s*analyst|bi\s*analyst|business\s*intelligence)\b/i,
    label: 'Data Analyst',
  },
  {
    match: /\b(data\s*engineer|data\s*platform)\b/i,
    label: 'Data Engineer',
  },
  {
    match: /\b(qa|quality\s*assurance|test|sdit|automation)\s*(engineer|analyst)?\b/i,
    label: 'QA Engineer',
  },
  {
    match: /\b(product\s*manager|technical\s*product\s*manager|pm)\b/i,
    label: 'Product Manager',
  },
  {
    match: /\b(ux[\s/]?ui|product\s*designer|ux\s*designer|ui\s*designer)\b/i,
    label: 'Product Designer',
  },
]

export function extractSeniority(rawTitle = '') {
  if (!rawTitle) return null
  for (const { match, label } of SENIORITY_PATTERNS) {
    if (match.test(rawTitle)) return label
  }
  return null
}

export function normalizeTitle(rawTitle = '') {
  if (!rawTitle || typeof rawTitle !== 'string') return 'Unknown Role'

  const trimmed = rawTitle.trim()
  const seniority = extractSeniority(trimmed)

  let baseRole = null
  for (const { match, label } of ROLE_PATTERNS) {
    if (match.test(trimmed)) {
      baseRole = label
      break
    }
  }

  if (!baseRole) {
    // Clean up excessive whitespace and punctuation if not matching standard dictionary
    baseRole = trimmed
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // If seniority found and baseRole doesn't already start with it, prepend
  if (seniority && !baseRole.toLowerCase().startsWith(seniority.toLowerCase())) {
    return `${seniority} ${baseRole}`
  }

  return baseRole || 'Unknown Role'
}
