import { useState } from 'react'

function formatDate(isoString) {
  if (!isoString) return null
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return null }
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
}

const SCORE_COLORS = {
  excellent: { bg: '#0c3329', border: '#1f6b57', text: '#6ee7b7' },
  strong: { bg: '#0f2f1b', border: '#27624a', text: '#86efac' },
  moderate: { bg: '#2e2c0c', border: '#6b6417', text: '#fde68a' },
  weak: { bg: '#3d2f0f', border: '#7a5e1e', text: '#fedb88' },
  poor: { bg: '#451a24', border: '#852a3b', text: '#fca5a5' },
}

const STATUS_OPTIONS = [
  { value: 'discovered', label: 'Discovered', icon: '🔍' },
  { value: 'shortlisted', label: 'Shortlisted', icon: '📋' },
  { value: 'interested', label: 'Interested', icon: '⭐' },
  { value: 'applied', label: 'Applied', icon: '📨' },
  { value: 'interview', label: 'Interview', icon: '🎤' },
  { value: 'offer', label: 'Offer', icon: '🎉' },
  { value: 'rejected', label: 'Rejected', icon: '❌' },
  { value: 'archived', label: 'Archived', icon: '📦' },
]

const FILTER_BADGE = {
  eligible: { bg: '#0c3329', border: '#1f6b57', text: '#a3f7df', label: '✓ Eligible' },
  review: { bg: '#3d2f0f', border: '#7a5e1e', text: '#fedb88', label: '⚠ Review' },
  rejected: { bg: '#451a24', border: '#852a3b', text: '#ffb3be', label: '✗ Filtered' },
  pending: { bg: '#132b45', border: '#27527f', text: '#a8d5ff', label: '… Pending' },
}

const API = 'http://localhost:5000/api'

export function JobCard({ job, onJobUpdated, onSelectJob, isSelected }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)

  const postedDate = formatDate(job.postedAt)
  const discoveredDate = formatDate(job.discoveredAt)
  const plainDescription = stripHtml(job.description)
  const hasLongDescription = plainDescription.length > 200

  const scoreColors = SCORE_COLORS[job.matchRating] || SCORE_COLORS.poor
  const filterInfo = FILTER_BADGE[job.filterStatus] || FILTER_BADGE.pending

  const toggleSave = async () => {
    setSaving(true)
    try {
      const method = job.isSaved ? 'DELETE' : 'POST'
      const response = await fetch(`${API}/jobs/${job.id}/save`, { method })
      if (response.ok && onJobUpdated) {
        const data = await response.json()
        onJobUpdated({ ...job, ...data.job })
      }
    } catch { /* silently fail */ } finally { setSaving(false) }
  }

  const changeStatus = async (event) => {
    const newStatus = event.target.value
    setStatusChanging(true)
    try {
      const response = await fetch(`${API}/jobs/${job.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok && onJobUpdated) {
        const data = await response.json()
        onJobUpdated({ ...job, ...data.job })
      }
    } catch { /* silently fail */ } finally { setStatusChanging(false) }
  }

  const matchedSkills = job.matchedSkills ? (typeof job.matchedSkills === 'string' ? JSON.parse(job.matchedSkills) : job.matchedSkills) : []
  const missingSkills = job.missingSkills ? (typeof job.missingSkills === 'string' ? JSON.parse(job.missingSkills) : job.missingSkills) : []

  return (
    <article className={`job-card ${isSelected ? 'job-card-selected' : ''}`} id={`job-card-${job.id}`}>
      <div className="job-card-header">
        <div className="job-card-title-area" onClick={() => onSelectJob?.(job)} style={{ cursor: onSelectJob ? 'pointer' : 'default' }}>
          <h3 className="job-title">
            {job.normalizedTitle || job.title}
            {job.normalizedTitle && job.normalizedTitle !== job.title && (
              <span className="original-title" title={`Original: ${job.title}`}> ↩</span>
            )}
          </h3>
          <p className="job-company">
            <strong>{job.normalizedCompany || job.company?.name || 'Unknown Company'}</strong>
            {(job.normalizedLocation || job.location) && (
              <span className="job-location"> · 📍 {job.normalizedLocation || job.location}</span>
            )}
          </p>
        </div>
        <div className="job-card-right">
          {job.matchScore != null && (
            <div className="match-score-badge" style={{ background: scoreColors.bg, borderColor: scoreColors.border, color: scoreColors.text }}>
              <span className="score-value">{Math.round(job.matchScore)}</span>
              <span className="score-label">{job.matchRating || 'match'}</span>
            </div>
          )}
          <button
            className={`save-btn ${job.isSaved ? 'saved' : ''}`}
            onClick={toggleSave}
            disabled={saving}
            title={job.isSaved ? 'Remove from saved' : 'Save job'}
          >
            {job.isSaved ? '★' : '☆'}
          </button>
        </div>
      </div>

      <div className="job-badges">
        <span className="badge badge-source">{job.source}</span>
        {(job.normalizedWorkMode || job.workMode) && (
          <span className="badge badge-workmode">{job.normalizedWorkMode || job.workMode}</span>
        )}
        {(job.normalizedEmploymentType || job.employmentType) && (
          <span className="badge badge-type">{job.normalizedEmploymentType || job.employmentType}</span>
        )}
        {(job.salaryMin || job.salaryMax || job.salaryText) && (
          <span className="badge badge-salary">
            💰 {job.salaryMin && job.salaryMax
              ? `${job.salaryCurrency || ''} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`
              : job.salaryText || 'Salary available'}
          </span>
        )}
        <span className="badge" style={{ background: filterInfo.bg, borderColor: filterInfo.border, color: filterInfo.text, border: `1px solid ${filterInfo.border}` }}>
          {filterInfo.label}
        </span>
        {job.isDuplicate && <span className="badge badge-duplicate">⊘ Duplicate</span>}
      </div>

      {/* Skills display */}
      {(matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div className="job-skills-row">
          {matchedSkills.slice(0, 6).map((skill) => (
            <span key={skill} className="skill-chip skill-matched">{skill}</span>
          ))}
          {missingSkills.slice(0, 4).map((skill) => (
            <span key={skill} className="skill-chip skill-missing">{skill}</span>
          ))}
        </div>
      )}

      {plainDescription && (
        <div className="job-description-container">
          <p className="job-description">
            {expanded || !hasLongDescription ? plainDescription : `${plainDescription.slice(0, 200)}…`}
          </p>
          {hasLongDescription && (
            <button type="button" className="text-button text-toggle" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show less' : 'Read details'}
            </button>
          )}
        </div>
      )}

      <footer className="job-card-footer">
        <div className="job-dates">
          {postedDate && <span>Posted: {postedDate}</span>}
          {discoveredDate && <span>Discovered: {discoveredDate}</span>}
        </div>
        <div className="job-actions">
          <select
            className="status-select"
            value={job.status || 'discovered'}
            onChange={changeStatus}
            disabled={statusChanging}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
            ))}
          </select>
          {job.jobUrl && (
            <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="button job-link-btn" id={`view-job-${job.id}`}>
              View ↗
            </a>
          )}
        </div>
      </footer>
    </article>
  )
}
