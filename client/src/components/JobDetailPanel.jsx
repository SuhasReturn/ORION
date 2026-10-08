import { useState } from 'react'

const API = 'http://localhost:5000/api'

function formatDate(isoString) {
  if (!isoString) return null
  try {
    return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return null }
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
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

export function JobDetailPanel({ job, onClose, onJobUpdated }) {
  const [notes, setNotes] = useState(job.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState(job.aiSummary || null)
  const [aiError, setAiError] = useState(null)

  const matchReasons = job.matchReasons
    ? (typeof job.matchReasons === 'string' ? JSON.parse(job.matchReasons) : job.matchReasons)
    : []
  const filterReasons = job.filterReasons
    ? (typeof job.filterReasons === 'string' ? JSON.parse(job.filterReasons) : job.filterReasons)
    : []
  const matchedSkills = job.matchedSkills
    ? (typeof job.matchedSkills === 'string' ? JSON.parse(job.matchedSkills) : job.matchedSkills)
    : []
  const missingSkills = job.missingSkills
    ? (typeof job.missingSkills === 'string' ? JSON.parse(job.missingSkills) : job.missingSkills)
    : []

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      const response = await fetch(`${API}/jobs/${job.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (response.ok && onJobUpdated) {
        onJobUpdated({ ...job, notes })
      }
    } catch { /* fail silently */ } finally { setSavingNotes(false) }
  }

  const generateAiSummary = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const response = await fetch(`${API}/jobs/${job.id}/ai-summary`, { method: 'POST' })
      const data = await response.json()
      if (data.available === false) {
        setAiError('Ollama is offline. Start Ollama locally to enable AI summaries.')
      } else if (data.summary) {
        setAiSummary(data.summary)
        if (onJobUpdated) onJobUpdated({ ...job, aiSummary: data.summary })
      }
    } catch {
      setAiError('Failed to connect to AI service.')
    } finally { setAiLoading(false) }
  }

  const changeStatus = async (event) => {
    try {
      const response = await fetch(`${API}/jobs/${job.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: event.target.value }),
      })
      if (response.ok && onJobUpdated) {
        const data = await response.json()
        onJobUpdated({ ...job, ...data.job })
      }
    } catch { /* fail silently */ }
  }

  return (
    <div className="detail-panel-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside className="detail-panel">
        <header className="detail-header">
          <div>
            <p className="eyebrow">JOB DETAILS</p>
            <h2>{job.normalizedTitle || job.title}</h2>
            <p className="muted">
              {job.normalizedCompany || job.company?.name || 'Unknown'}
              {(job.normalizedLocation || job.location) && ` · ${job.normalizedLocation || job.location}`}
            </p>
          </div>
          <button className="close-panel" onClick={onClose} aria-label="Close panel">✕</button>
        </header>

        {/* Score & Status */}
        <div className="detail-score-row">
          {job.matchScore != null && (
            <div className={`detail-score score-${job.matchRating || 'poor'}`}>
              <span className="score-big">{Math.round(job.matchScore)}</span>
              <span className="score-sub">{job.matchRating} match</span>
            </div>
          )}
          <select className="status-select detail-status" value={job.status || 'discovered'} onChange={changeStatus}>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
            ))}
          </select>
        </div>

        {/* Match Reasons */}
        {matchReasons.length > 0 && (
          <div className="detail-section">
            <h4>Match Analysis</h4>
            <ul className="reason-list">
              {matchReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* Filter Reasons */}
        {filterReasons.length > 0 && (
          <div className="detail-section">
            <h4>Filter Notes</h4>
            <ul className="reason-list">
              {filterReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* Skills */}
        {(matchedSkills.length > 0 || missingSkills.length > 0) && (
          <div className="detail-section">
            <h4>Skills Breakdown</h4>
            <div className="detail-skills">
              {matchedSkills.map((s) => <span key={s} className="skill-chip skill-matched">{s}</span>)}
              {missingSkills.map((s) => <span key={s} className="skill-chip skill-missing">{s}</span>)}
            </div>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div className="detail-section">
            <h4>Description</h4>
            <div className="detail-description">{stripHtml(job.description)}</div>
          </div>
        )}

        {/* AI Summary (Module 8) */}
        <div className="detail-section">
          <h4>AI Summary <span className="muted-sm">(Optional · Ollama)</span></h4>
          {aiSummary ? (
            <div className="ai-summary-text">{aiSummary}</div>
          ) : aiError ? (
            <p className="ai-error">{aiError}</p>
          ) : (
            <button className="button secondary" onClick={generateAiSummary} disabled={aiLoading}>
              {aiLoading ? '⏳ Generating…' : '🤖 Generate AI Summary'}
            </button>
          )}
        </div>

        {/* Notes (Module 9) */}
        <div className="detail-section">
          <h4>Your Notes</h4>
          <textarea
            className="detail-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this job…"
            rows={4}
          />
          <button className="button secondary" onClick={saveNotes} disabled={savingNotes}>
            {savingNotes ? 'Saving…' : 'Save Notes'}
          </button>
        </div>

        {/* Meta */}
        <div className="detail-section detail-meta">
          <p><span>Source:</span> <b>{job.source}</b></p>
          {formatDate(job.postedAt) && <p><span>Posted:</span> <b>{formatDate(job.postedAt)}</b></p>}
          <p><span>Discovered:</span> <b>{formatDate(job.discoveredAt)}</b></p>
          {job.jobUrl && (
            <p>
              <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="button">
                Open Original Listing ↗
              </a>
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
