/**
 * Location normalizer.
 * Standardizes common Indian and Global city aliases and remote indicators.
 */

const CITY_ALIASES = [
  { match: /\b(bangalore|bengaluru)\b/i, canonical: 'Bengaluru, India' },
  { match: /\b(bombay|mumbai)\b/i, canonical: 'Mumbai, India' },
  { match: /\b(calcutta|kolkata)\b/i, canonical: 'Kolkata, India' },
  { match: /\b(madras|chennai)\b/i, canonical: 'Chennai, India' },
  { match: /\b(delhi[\s-]ncr|new\s*delhi|delhi)\b/i, canonical: 'New Delhi, India' },
  { match: /\b(hyderabad|secunderabad)\b/i, canonical: 'Hyderabad, India' },
  { match: /\b(pune)\b/i, canonical: 'Pune, India' },
  { match: /\b(gurgaon|gurugram)\b/i, canonical: 'Gurugram, India' },
  { match: /\b(noida)\b/i, canonical: 'Noida, India' },
  { match: /\b(san\s*francisco|sf(\s*bay)?)\b/i, canonical: 'San Francisco, CA' },
  { match: /\b(new\s*york(\s*city)?|nyc)\b/i, canonical: 'New York, NY' },
  { match: /\b(seattle)\b/i, canonical: 'Seattle, WA' },
  { match: /\b(london)\b/i, canonical: 'London, UK' },
  { match: /\b(berlin)\b/i, canonical: 'Berlin, Germany' },
  { match: /\b(singapore)\b/i, canonical: 'Singapore' },
  { match: /\b(toronto)\b/i, canonical: 'Toronto, Canada' },
]

const REMOTE_INDICATORS = /\b(remote|worldwide|anywhere|global|work\s*from\s*home|wfh)\b/i

export function normalizeLocation(rawLocation = '') {
  if (!rawLocation || typeof rawLocation !== 'string') return 'Unspecified'

  const trimmed = rawLocation.trim()
  if (REMOTE_INDICATORS.test(trimmed)) {
    // If specific country is attached, e.g. "US Remote" or "Remote, UK"
    if (/\b(us|usa|united\s*states)\b/i.test(trimmed)) return 'Remote (US)'
    if (/\b(india|in)\b/i.test(trimmed)) return 'Remote (India)'
    if (/\b(europe|eu)\b/i.test(trimmed)) return 'Remote (Europe)'
    return 'Remote (Worldwide)'
  }

  for (const { match, canonical } of CITY_ALIASES) {
    if (match.test(trimmed)) return canonical
  }

  return trimmed
    .replace(/[^\w\s,.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
