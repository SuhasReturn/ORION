/**
 * Skill normalizer and extractor.
 * Maps technology aliases to canonical names and extracts skills from job text.
 */

const SKILL_ALIASES = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  react: 'React',
  reactjs: 'React',
  'react.js': 'React',
  vue: 'Vue.js',
  vuejs: 'Vue.js',
  'vue.js': 'Vue.js',
  angular: 'Angular',
  angularjs: 'Angular',
  node: 'Node.js',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  express: 'Express',
  expressjs: 'Express',
  python: 'Python',
  py: 'Python',
  django: 'Django',
  fastapi: 'FastAPI',
  flask: 'Flask',
  java: 'Java',
  spring: 'Spring Boot',
  springboot: 'Spring Boot',
  'spring boot': 'Spring Boot',
  golang: 'Go',
  go: 'Go',
  rust: 'Rust',
  cplusplus: 'C++',
  'c++': 'C++',
  csharp: 'C#',
  'c#': 'C#',
  dotnet: '.NET',
  '.net': '.NET',
  sql: 'SQL',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  redis: 'Redis',
  graphql: 'GraphQL',
  rest: 'REST API',
  docker: 'Docker',
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  aws: 'AWS',
  amazonwebservices: 'AWS',
  gcp: 'Google Cloud',
  azure: 'Azure',
  git: 'Git',
  github: 'GitHub',
  linux: 'Linux',
  ci_cd: 'CI/CD',
  'ci/cd': 'CI/CD',
  tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS',
  html: 'HTML5',
  css: 'CSS3',
}

export function normalizeSkill(rawSkill = '') {
  if (!rawSkill || typeof rawSkill !== 'string') return ''
  const key = rawSkill.trim().toLowerCase()
  return SKILL_ALIASES[key] || rawSkill.trim()
}

/**
 * Extracts recognized technical skills from job title and description text.
 */
export function extractSkillsFromText(text = '') {
  if (!text || typeof text !== 'string') return []

  const found = new Set()
  const lower = text.toLowerCase()

  // Match specific patterns
  const matchers = [
    { pattern: /\b(javascript|js)\b/i, name: 'JavaScript' },
    { pattern: /\b(typescript|ts)\b/i, name: 'TypeScript' },
    { pattern: /\b(react|react\.js|reactjs)\b/i, name: 'React' },
    { pattern: /\b(node|node\.js|nodejs)\b/i, name: 'Node.js' },
    { pattern: /\b(python)\b/i, name: 'Python' },
    { pattern: /\b(java)\b(?!\s*script)/i, name: 'Java' },
    { pattern: /\b(golang|go)\b(?!\s*(ahead|back|to|through))/i, name: 'Go' },
    { pattern: /\b(rust)\b/i, name: 'Rust' },
    { pattern: /\b(c\+\+|cpp)\b/i, name: 'C++' },
    { pattern: /\b(c#|\.net)\b/i, name: 'C#' },
    { pattern: /\b(sql)\b/i, name: 'SQL' },
    { pattern: /\b(postgres|postgresql)\b/i, name: 'PostgreSQL' },
    { pattern: /\b(mongodb|mongo)\b/i, name: 'MongoDB' },
    { pattern: /\b(redis)\b/i, name: 'Redis' },
    { pattern: /\b(docker)\b/i, name: 'Docker' },
    { pattern: /\b(kubernetes|k8s)\b/i, name: 'Kubernetes' },
    { pattern: /\b(aws|amazon\s*web\s*services)\b/i, name: 'AWS' },
    { pattern: /\b(gcp|google\s*cloud)\b/i, name: 'Google Cloud' },
    { pattern: /\b(azure)\b/i, name: 'Azure' },
    { pattern: /\b(graphql)\b/i, name: 'GraphQL' },
    { pattern: /\b(rest|restful\s*api)\b/i, name: 'REST API' },
    { pattern: /\b(git)\b/i, name: 'Git' },
    { pattern: /\b(ci[\s/]?cd)\b/i, name: 'CI/CD' },
    { pattern: /\b(html|html5)\b/i, name: 'HTML5' },
    { pattern: /\b(css|css3|tailwind)\b/i, name: 'CSS3' },
  ]

  for (const { pattern, name } of matchers) {
    if (pattern.test(lower)) {
      found.add(name)
    }
  }

  return Array.from(found).sort()
}
