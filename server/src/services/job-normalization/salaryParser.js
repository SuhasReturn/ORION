/**
 * Salary parser.
 * Extracts normalized salaryMin, salaryMax, and salaryCurrency from raw salary strings.
 * Supports INR (₹, LPA), USD ($), EUR (€), GBP (£).
 */

export function parseSalary(salaryText = '') {
  if (!salaryText || typeof salaryText !== 'string') {
    return { salaryMin: null, salaryMax: null, salaryCurrency: null }
  }

  const text = salaryText.trim()
  if (!text) {
    return { salaryMin: null, salaryMax: null, salaryCurrency: null }
  }

  let currency = null
  if (/₹|\binr\b|\blpa\b|\blakhs?\b/i.test(text)) currency = 'INR'
  else if (/\$|\busd\b/i.test(text)) currency = 'USD'
  else if (/€|\beur\b|\beuro\b/i.test(text)) currency = 'EUR'
  else if (/£|\bgbp\b/i.test(text)) currency = 'GBP'

  // Case 1: Indian LPA notation e.g. "6 LPA", "6-10 LPA", "₹6.5 - 12 LPA"
  const lpaMatch = text.match(/(?:[₹$€£]\s*)?(\d+(?:\.\d+)?)\s*(?:[-–to]+)\s*(?:[₹$€£]\s*)?(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i)
  if (lpaMatch) {
    return {
      salaryMin: Math.round(Number(lpaMatch[1]) * 100_000),
      salaryMax: Math.round(Number(lpaMatch[2]) * 100_000),
      salaryCurrency: currency || 'INR',
    }
  }

  const singleLpaMatch = text.match(/(?:[₹$€£]\s*)?(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i)
  if (singleLpaMatch) {
    const val = Math.round(Number(singleLpaMatch[1]) * 100_000)
    return {
      salaryMin: val,
      salaryMax: val,
      salaryCurrency: currency || 'INR',
    }
  }

  // Case 2: '$80k - $100k' or '80k - 120k USD'
  const kRangeMatch = text.match(/(?:[₹$€£]\s*)?(\d+(?:\.\d+)?)\s*k\s*(?:[-–to]+)\s*(?:[₹$€£]\s*)?(\d+(?:\.\d+)?)\s*k/i)
  if (kRangeMatch) {
    return {
      salaryMin: Math.round(Number(kRangeMatch[1]) * 1000),
      salaryMax: Math.round(Number(kRangeMatch[2]) * 1000),
      salaryCurrency: currency || 'USD',
    }
  }

  const singleKMatch = text.match(/(?:[₹$€£]\s*)?(\d+(?:\.\d+)?)\s*k\b/i)
  if (singleKMatch && !text.includes('-') && !text.includes('–')) {
    const val = Math.round(Number(singleKMatch[1]) * 1000)
    return {
      salaryMin: val,
      salaryMax: val,
      salaryCurrency: currency || 'USD',
    }
  }

  // Case 3: Standard numeric ranges: "$80,000 - $120,000", "₹6,00,000 - ₹10,00,000"
  // Extract all numbers >= 1000
  const cleanNumbers = text
    .replace(/,/g, '')
    .match(/\b\d{4,9}\b/g)

  if (cleanNumbers && cleanNumbers.length >= 2) {
    const num1 = Number(cleanNumbers[0])
    const num2 = Number(cleanNumbers[1])
    return {
      salaryMin: Math.min(num1, num2),
      salaryMax: Math.max(num1, num2),
      salaryCurrency: currency,
    }
  }

  if (cleanNumbers && cleanNumbers.length === 1) {
    const num = Number(cleanNumbers[0])
    return {
      salaryMin: num,
      salaryMax: num,
      salaryCurrency: currency,
    }
  }

  return {
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: currency,
  }
}
