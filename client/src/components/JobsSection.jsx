import { useEffect, useState, useCallback } from 'react'
import { JobCard } from './JobCard.jsx'
import { JobDetailPanel } from './JobDetailPanel.jsx'

const API = 'http://localhost:5000/api'
const JOBS_URL = `${API}/jobs`
const DISCOVER_URL = `${API}/jobs/discover`

export function JobsSection({ preferences, onOpenPreferences, onJobsCountChange }) {
  const [jobs, setJobs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [discovering, setDiscovering] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [sortBy, setSortBy] = useState('date')
  const [filterStatus, setFilterStatus] = useState('')
  const [savedOnly, setSavedOnly] = useState(false)

  // Pipeline state
  const [normalizing, setNormalizing] = useState(false)
  const [filtering, setFiltering] = useState(false)
  const [matching, setMatching] = useState(false)

  const fetchJobs = useCallback(async (pageNum = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pageNum, limit: 10, sort: sortBy })
      if (savedOnly) params.set('saved', 'true')
      if (filterStatus) params.set('filterStatus', filterStatus)
      const response = await fetch(`${JOBS_URL}?${params}`)
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
        setTotal(data.total || 0)
        setPage(data.page || 1)
        setTotalPages(data.totalPages || 1)
        if (onJobsCountChange) onJobsCountChange(data.total || 0)
      }
    } catch { /* Backend may be momentarily unreachable */ } finally { setLoading(false) }
  }, [onJobsCountChange, sortBy, filterStatus, savedOnly])

  useEffect(() => { fetchJobs(1) }, [fetchJobs])

  const handleDiscover = async () => {
    if (!preferences) {
      setFeedback({ type: 'error', message: 'Please configure your job preferences first to guide job discovery.' })
      return
    }

    setDiscovering(true)
    setFeedback(null)

    try {
      const response = await fetch(DISCOVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()

      if (!response.ok) {
        setFeedback({ type: 'error', message: data.message || 'Job discovery could not be completed.' })
        return
      }

      const remotiveInfo = data.sources?.remotive
      if (remotiveInfo?.status === 'error') {
        if (data.totalStored > 0) {
          setFeedback({ type: 'warning', message: `Discovered ${data.totalStored} job(s), but Remotive reported: ${remotiveInfo.message}` })
        } else {
          setFeedback({ type: 'error', message: remotiveInfo.message || 'Job source failed to return results.' })
        }
      } else if (data.totalStored > 0) {
        const createdCount = remotiveInfo?.created ?? data.totalStored
        const updatedCount = remotiveInfo?.updated ?? 0
        setFeedback({ type: 'success', message: `Discovered ${data.totalDiscovered} job(s) from permitted sources (${createdCount} new, ${updatedCount} updated).` })
      } else {
        setFeedback({ type: 'info', message: 'Discovery ran successfully, but no new jobs matched your criteria.' })
      }
      await fetchJobs(1)
    } catch {
      setFeedback({ type: 'error', message: 'The local backend is unavailable. Could not run job discovery.' })
    } finally { setDiscovering(false) }
  }

  const runPipelineStep = async (endpoint, setRunning, successLabel) => {
    setRunning(true)
    setFeedback(null)
    try {
      const response = await fetch(`${API}/${endpoint}`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        setFeedback({ type: 'error', message: data.message || `${successLabel} failed.` })
        return
      }
      setFeedback({ type: 'success', message: `${successLabel}: ${data.processed || 0} jobs processed.${data.duplicatesFound ? ` ${data.duplicatesFound} duplicate(s) found.` : ''}${data.eligible != null ? ` ${data.eligible} eligible, ${data.rejected || 0} rejected.` : ''}${data.topScore ? ` Top score: ${data.topScore}.` : ''}` })
      await fetchJobs(1)
    } catch {
      setFeedback({ type: 'error', message: `Backend unavailable. ${successLabel} failed.` })
    } finally { setRunning(false) }
  }

  const runFullPipeline = async () => {
    setFeedback({ type: 'info', message: '⏳ Running full pipeline: Discover → Normalize → Filter → Match…' })

    // Step 1: Discover
    if (preferences) {
      setDiscovering(true)
      try {
        await fetch(DISCOVER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      } catch { /* continue anyway */ }
      setDiscovering(false)
    }

    // Step 2: Normalize
    setNormalizing(true)
    try { await fetch(`${API}/jobs/normalize`, { method: 'POST' }) } catch { /* continue */ }
    setNormalizing(false)

    // Step 3: Filter
    setFiltering(true)
    try { await fetch(`${API}/jobs/filter`, { method: 'POST' }) } catch { /* continue */ }
    setFiltering(false)

    // Step 4: Match
    setMatching(true)
    try { await fetch(`${API}/jobs/match`, { method: 'POST' }) } catch { /* continue */ }
    setMatching(false)

    await fetchJobs(1)
    setFeedback({ type: 'success', message: '✅ Full pipeline complete. Jobs have been discovered, normalized, filtered, and scored.' })
  }

  const handleJobUpdated = (updatedJob) => {
    setJobs(jobs.map(j => j.id === updatedJob.id ? { ...j, ...updatedJob } : j))
    if (selectedJob?.id === updatedJob.id) setSelectedJob({ ...selectedJob, ...updatedJob })
  }

  const pipelineRunning = discovering || normalizing || filtering || matching

  return (
    <section className="jobs-section card" id="job-discovery-section">
      <header className="jobs-section-header">
        <div>
          <p className="eyebrow">MODULES 4–9 · JOB PIPELINE</p>
          <h2>Job Opportunities</h2>
          <p className="muted">
            Discover → Normalize → Deduplicate → Filter → Match → Track
          </p>
        </div>
      </header>

      {/* Pipeline Controls */}
      <div className="pipeline-controls">
        <div className="pipeline-buttons">
          <button type="button" className="button discover-btn" id="discover-jobs-btn"
            onClick={handleDiscover} disabled={discovering || !preferences}>
            {discovering ? <span className="spinner-text"><span className="spinner" /> Discovering…</span> : '🔍 Discover'}
          </button>
          <button type="button" className="button secondary" onClick={() => runPipelineStep('jobs/normalize', setNormalizing, 'Normalization')} disabled={normalizing}>
            {normalizing ? <span className="spinner-text"><span className="spinner" /> Normalizing…</span> : '📐 Normalize'}
          </button>
          <button type="button" className="button secondary" onClick={() => runPipelineStep('jobs/filter', setFiltering, 'Filtering')} disabled={filtering}>
            {filtering ? <span className="spinner-text"><span className="spinner" /> Filtering…</span> : '🧹 Filter'}
          </button>
          <button type="button" className="button secondary" onClick={() => runPipelineStep('jobs/match', setMatching, 'Matching')} disabled={matching}>
            {matching ? <span className="spinner-text"><span className="spinner" /> Matching…</span> : '🎯 Match'}
          </button>
          <button type="button" className="button pipeline-full-btn" onClick={runFullPipeline} disabled={pipelineRunning}>
            {pipelineRunning ? '⏳ Running…' : '⚡ Full Pipeline'}
          </button>
        </div>

        {/* Filters & Sort */}
        <div className="pipeline-filters">
          <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Sort: Date</option>
            <option value="score">Sort: Score</option>
          </select>
          <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="eligible">Eligible</option>
            <option value="review">Review</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Pending</option>
          </select>
          <label className="saved-toggle">
            <input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} />
            ★ Saved only
          </label>
        </div>
      </div>

      {!preferences && (
        <div className="callout callout-warning">
          <p><strong>Job preferences are required before discovery.</strong> Set your desired roles and work modes so ORION knows what to look for.</p>
          <button type="button" className="button secondary" onClick={onOpenPreferences}>Configure Preferences</button>
        </div>
      )}

      {feedback && (
        <div className={`callout callout-${feedback.type}`} role="alert" id="discovery-feedback-alert">
          <span>{feedback.message}</span>
          <button type="button" className="close-callout" onClick={() => setFeedback(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {loading && jobs.length === 0 ? (
        <div className="jobs-loading">
          <span className="spinner large" />
          <p className="muted">Loading jobs…</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="jobs-empty-state" id="jobs-empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No Jobs Found</h3>
          <p className="muted">
            {preferences
              ? savedOnly ? 'No saved jobs yet. Star a job to save it.' : 'Click "Discover Jobs" or "Full Pipeline" above to search for matching roles.'
              : 'Configure your job preferences to enable discovery.'}
          </p>
        </div>
      ) : (
        <div className="jobs-list" id="jobs-list-container">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onJobUpdated={handleJobUpdated}
              onSelectJob={setSelectedJob}
              isSelected={selectedJob?.id === job.id}
            />
          ))}

          {totalPages > 1 && (
            <nav className="pagination-bar" aria-label="Jobs pagination">
              <button type="button" className="button secondary pagination-btn" id="prev-page-btn"
                disabled={page <= 1 || loading} onClick={() => fetchJobs(page - 1)}>← Previous</button>
              <span className="pagination-info">Page {page} of {totalPages} ({total} total)</span>
              <button type="button" className="button secondary pagination-btn" id="next-page-btn"
                disabled={page >= totalPages || loading} onClick={() => fetchJobs(page + 1)}>Next →</button>
            </nav>
          )}
        </div>
      )}

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onJobUpdated={handleJobUpdated}
        />
      )}

      <footer className="jobs-section-footer">
        <p className="compliance-note">
          🔒 <strong>Privacy & Ethics:</strong> All data is stored locally in SQLite. ORION does not
          automatically apply to jobs or contact recruiters.
        </p>
      </footer>
    </section>
  )
}
