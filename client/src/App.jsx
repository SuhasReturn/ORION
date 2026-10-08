import { useEffect, useMemo, useState } from 'react'
import { JobsSection } from './components/JobsSection.jsx'
import { ContactsSection } from './components/ContactsSection.jsx'


const apiUrl = 'http://localhost:5000/api/profile'
const preferencesUrl = 'http://localhost:5000/api/preferences'
const steps = ['Welcome', 'Personal information', 'Education', 'Experience', 'Resume upload', 'Review', 'Complete']
const blankProfile = { name: '', email: '', phone: '', location: '', linkedinUrl: '', githubUrl: '', portfolioUrl: '', degree: '', branch: '', university: '', graduationYear: '', cgpa: '', experienceLevel: 'student', currentRole: '', bio: '' }

function Input({ label, name, profile, change, error, type = 'text', optional = false }) {
  return <label className="field"><span>{label} {optional && <em>Optional</em>}</span><input name={name} value={profile[name]} onChange={change} type={type} aria-invalid={Boolean(error)} />{error && <small>{error}</small>}</label>
}

function App() {
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState(blankProfile)
  const [resume, setResume] = useState(null)
  const [saved, setSaved] = useState(null)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch(apiUrl).then(async (response) => {
    if (response.ok) setSaved((await response.json()).profile)
    else if (response.status !== 404) setMessage('Could not check the local profile. You can still continue.')
  }).catch(() => setMessage('The local backend is unavailable. Start it and try again.')).finally(() => setLoading(false)) }, [])

  const completion = useMemo(() => {
    const required = ['name', 'email', 'location', 'degree', 'university', 'graduationYear', 'experienceLevel']
    return Math.round(((required.filter((key) => profile[key]).length + (resume ? 1 : 0)) / 8) * 100)
  }, [profile, resume])
  const change = (event) => { setProfile({ ...profile, [event.target.name]: event.target.value }); setErrors({ ...errors, [event.target.name]: undefined }) }
  const validate = () => {
    const next = {}
    if (step === 1) { if (!profile.name.trim()) next.name = 'Name is required.'; if (!/^\S+@\S+\.\S+$/.test(profile.email)) next.email = 'Enter a valid email.'; if (!profile.location.trim()) next.location = 'Location is required.' }
    if (step === 2) { if (!profile.degree.trim()) next.degree = 'Degree is required.'; if (!profile.university.trim()) next.university = 'University is required.'; if (!/^\d{4}$/.test(profile.graduationYear)) next.graduationYear = 'Enter a four-digit year.'; if (profile.cgpa && (Number(profile.cgpa) < 0 || Number(profile.cgpa) > 10)) next.cgpa = 'CGPA must be between 0 and 10.' }
    if (step === 3 && !profile.experienceLevel) next.experienceLevel = 'Select an experience level.'
    if (step === 4 && !resume) next.resume = 'Select a PDF resume to continue.'
    setErrors(next); return !Object.keys(next).length
  }
  const next = () => { setMessage(''); if (validate()) setStep(Math.min(step + 1, 5)) }
  const chooseResume = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if ((!file.type || file.type !== 'application/pdf') && !file.name.toLowerCase().endsWith('.pdf')) { setErrors({ resume: 'Only PDF files are allowed.' }); event.target.value = ''; return }
    if (file.size > 10 * 1024 * 1024) { setErrors({ resume: 'The PDF must be 10 MB or smaller.' }); event.target.value = ''; return }
    setResume(file); setErrors({})
  }
  const save = async () => {
    setSaving(true); setMessage('')
    const body = new FormData(); Object.entries(profile).forEach(([key, value]) => body.append(key, value)); body.append('resume', resume)
    try { const response = await fetch(apiUrl, { method: 'POST', body }); const result = await response.json(); if (!response.ok) { setErrors(result.errors ?? {}); setMessage(result.message ?? 'Could not save your profile.'); return }; setSaved(result.profile); setStep(6) } catch { setMessage('The local backend is unavailable. Your profile was not saved.') } finally { setSaving(false) }
  }
  if (loading) return <main className="app-shell"><p>Loading your local ORION workspace…</p></main>
  if (saved && step !== 6) return <Dashboard profile={saved} />
  return <main className="app-shell"><section className="card"><header><p className="eyebrow">ORION · LOCAL-FIRST</p><h1>{steps[step]}</h1><p className="muted">Step {step + 1} of {steps.length}</p><div className="progress"><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></header>{message && <p className="message">{message}</p>}{step === 0 && <p className="content">Build your candidate profile privately. ORION stores your details and resume only on this computer.</p>}{step === 1 && <div className="grid"><Input label="Full name" name="name" profile={profile} change={change} error={errors.name}/><Input label="Email" name="email" profile={profile} change={change} error={errors.email} type="email"/><Input label="Phone" name="phone" profile={profile} change={change} optional/><Input label="Location" name="location" profile={profile} change={change} error={errors.location}/><Input label="LinkedIn URL" name="linkedinUrl" profile={profile} change={change} optional/><Input label="GitHub URL" name="githubUrl" profile={profile} change={change} optional/><Input label="Portfolio URL" name="portfolioUrl" profile={profile} change={change} optional/></div>}{step === 2 && <div className="grid"><Input label="Degree" name="degree" profile={profile} change={change} error={errors.degree}/><Input label="Branch / specialization" name="branch" profile={profile} change={change} optional/><Input label="University" name="university" profile={profile} change={change} error={errors.university}/><Input label="Graduation year" name="graduationYear" profile={profile} change={change} error={errors.graduationYear} type="number"/><Input label="CGPA" name="cgpa" profile={profile} change={change} error={errors.cgpa} type="number" optional/></div>}{step === 3 && <div className="grid"><label className="field"><span>Experience level</span><select name="experienceLevel" value={profile.experienceLevel} onChange={change}><option value="student">Student</option><option value="entry">Entry level</option><option value="junior">Junior</option><option value="mid">Mid level</option><option value="senior">Senior</option></select></label><Input label="Current role" name="currentRole" profile={profile} change={change} optional/><label className="field full"><span>Short bio <em>Optional</em></span><textarea name="bio" value={profile.bio} onChange={change} rows="5" /></label></div>}{step === 4 && <label className="resume"><input type="file" accept="application/pdf,.pdf" onChange={chooseResume}/><strong>{resume ? resume.name : 'Select your resume PDF'}</strong><span>{resume ? `${Math.ceil(resume.size / 1024)} KB · stored locally after saving` : 'PDF only · maximum 10 MB'}</span>{errors.resume && <small>{errors.resume}</small>}</label>}{step === 5 && <div className="review"><p><span>Name</span><b>{profile.name}</b></p><p><span>Contact</span><b>{profile.email} · {profile.location}</b></p><p><span>Education</span><b>{profile.degree}, {profile.university}</b></p><p><span>Experience</span><b>{profile.experienceLevel}</b></p><p><span>Resume</span><b>{resume?.name}</b></p></div>}{step === 6 && <div className="complete"><strong>✓</strong><h2>Your ORION profile has been created.</h2><p>Details and resume reference are stored only in your local ORION database and data folder.</p><button className="button" onClick={() => setStep(7)}>Go to dashboard</button></div>}{step < 6 && <nav className="actions">{step > 0 && <button className="button secondary" onClick={() => setStep(step - 1)}>Back</button>}{step < 5 ? <button className="button" onClick={next}>Next</button> : <button className="button" onClick={save} disabled={saving}>{saving ? 'Saving locally…' : 'Save profile'}</button>}</nav>}</section></main>
}

const emptyPreferences = { desiredRoles: [], preferredLocations: [], preferredIndustries: [], requiredSkills: [], preferredSkills: [], preferredWorkMode: 'any', employmentType: 'any', minimumSalary: '', experienceLevel: 'student', willingToRelocate: false }

function Dashboard({ profile }) {
  const [preferences, setPreferences] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  const [jobsCount, setJobsCount] = useState(0)
  const [activeTab, setActiveTab] = useState('jobs')
  const [aiStatus, setAiStatus] = useState(null)
  const [savedCount, setSavedCount] = useState(0)
  const [contactsCount, setContactsCount] = useState(0)

  useEffect(() => {
    fetch(preferencesUrl)
      .then(async (response) => {
        if (response.ok) {
          const result = await response.json()
          setPreferences(result.preferences)
        }
      })
      .finally(() => setLoadingPreferences(false))

    // Fetch AI status (optional)
    fetch('http://localhost:5000/api/ai/status')
      .then(async (r) => { if (r.ok) setAiStatus(await r.json()) })
      .catch(() => setAiStatus({ available: false }))

    // Fetch saved jobs count
    fetch('http://localhost:5000/api/jobs?saved=true&limit=1')
      .then(async (r) => { if (r.ok) { const d = await r.json(); setSavedCount(d.total || 0) } })
      .catch(() => {})

    // Fetch contacts count
    fetch('http://localhost:5000/api/contacts')
      .then(async (r) => { if (r.ok) { const d = await r.json(); setContactsCount(d.contacts?.length || 0) } })
      .catch(() => {})
  }, [])

  if (showForm) {
    return (
      <PreferenceForm
        existing={preferences}
        onCancel={() => setShowForm(false)}
        onSaved={(next) => {
          setPreferences(next)
          setShowForm(false)
        }}
      />
    )
  }

  return (
    <main className="app-shell dashboard-shell">
      <section className="card dashboard">
        <p className="eyebrow">ORION · DASHBOARD</p>
        <h1>Welcome, {profile.name}</h1>
        <p className="muted">Your local opportunity workspace is ready.</p>
        <div className="stats">
          <p>
            <span>Candidate Profile</span>
            <b>✓ Complete</b>
          </p>
          <p>
            <span>Job Preferences</span>
            <b>{loadingPreferences ? 'Checking…' : preferences ? '✓ Configured' : '⚠ Not configured'}</b>
            <button
              id="edit-preferences-btn"
              className="text-button"
              onClick={() => setShowForm(true)}
              disabled={loadingPreferences}
            >
              {preferences ? 'Edit preferences' : 'Configure preferences'}
            </button>
          </p>
          <p>
            <span>Resume status</span>
            <b>{profile.resumeUploaded ? 'PDF saved locally' : 'Not uploaded'}</b>
          </p>
          <p>
            <span>Jobs found</span>
            <b id="jobs-count-stat">{jobsCount}</b>
          </p>
          <p>
            <span>Saved Jobs</span>
            <b>★ {savedCount}</b>
          </p>
          <p>
            <span>Contacts</span>
            <b>👤 {contactsCount}</b>
          </p>
          <p>
            <span>Local AI</span>
            <b className={aiStatus?.available ? 'ai-online' : 'ai-offline'}>
              {aiStatus?.available ? '🟢 Ollama Online' : '⚫ Ollama Offline'}
            </b>
          </p>
        </div>
      </section>

      {/* Tab Navigation */}
      <nav className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          💼 Jobs Pipeline
        </button>
        <button
          className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          👤 Contacts
        </button>
      </nav>

      {activeTab === 'jobs' && (
        <JobsSection
          preferences={preferences}
          onOpenPreferences={() => setShowForm(true)}
          onJobsCountChange={setJobsCount}
        />
      )}

      {activeTab === 'contacts' && (
        <ContactsSection />
      )}
    </main>
  )
}


function ChipEditor({ label, values, onChange, error, placeholder }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const value = draft.trim()
    if (!value || values.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) return
    onChange([...values, value]); setDraft('')
  }
  return <div className="chip-editor"><span>{label}</span><div className="chips">{values.map((value) => <button className="chip" type="button" key={value} onClick={() => onChange(values.filter((item) => item !== value))}>{value} <b>×</b></button>)}</div><div className="chip-input"><input value={draft} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add() } }} /><button className="button secondary" type="button" onClick={add}>Add</button></div>{error && <small>{error}</small>}</div>
}

function PreferenceForm({ existing, onCancel, onSaved }) {
  const [form, setForm] = useState(existing ? { ...existing, minimumSalary: existing.minimumSalary ?? '' } : emptyPreferences)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (key, value) => { setForm({ ...form, [key]: value }); setErrors({ ...errors, [key]: undefined }) }
  const save = async (event) => {
    event.preventDefault(); setMessage('')
    const nextErrors = {}
    if (!form.desiredRoles.length) nextErrors.desiredRoles = 'Add at least one desired role.'
    if (form.minimumSalary !== '' && (!/^\d+$/.test(String(form.minimumSalary)) || Number(form.minimumSalary) < 0)) nextErrors.minimumSalary = 'Use a non-negative whole number.'
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return }
    setSaving(true)
    try {
      const response = await fetch(preferencesUrl, { method: existing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, minimumSalary: form.minimumSalary === '' ? null : Number(form.minimumSalary) }) })
      const result = await response.json()
      if (!response.ok) { setErrors(result.errors ?? {}); setMessage(result.message ?? 'Could not save preferences.'); return }
      onSaved(result.preferences)
    } catch { setMessage('The local backend is unavailable. Your preferences were not saved.') } finally { setSaving(false) }
  }
  return <main className="app-shell"><section className="card preference-card"><p className="eyebrow">ORION · JOB PREFERENCES</p><h1>{existing ? 'Edit preferences' : 'Job preferences'}</h1><p className="muted">These local settings will guide future job discovery and matching.</p>{message && <p className="message">{message}</p>}<form onSubmit={save}><ChipEditor label="Desired roles" values={form.desiredRoles} onChange={(value) => update('desiredRoles', value)} error={errors.desiredRoles} placeholder="e.g. Frontend Developer"/><ChipEditor label="Preferred locations" values={form.preferredLocations} onChange={(value) => update('preferredLocations', value)} error={errors.preferredLocations} placeholder="e.g. Bengaluru"/><Choice label="Work mode" value={form.preferredWorkMode} options={[['remote', 'Remote'], ['hybrid', 'Hybrid'], ['on-site', 'On-site'], ['any', 'Any']]} onChange={(value) => update('preferredWorkMode', value)}/><Choice label="Employment type" value={form.employmentType} options={[['full-time', 'Full-time'], ['part-time', 'Part-time'], ['internship', 'Internship'], ['contract', 'Contract'], ['any', 'Any']]} onChange={(value) => update('employmentType', value)}/><label className="field"><span>Minimum salary <em>Optional</em></span><input value={form.minimumSalary} type="number" min="0" placeholder="₹ per year" onChange={(event) => update('minimumSalary', event.target.value)} />{errors.minimumSalary && <small>{errors.minimumSalary}</small>}</label><ChipEditor label="Preferred industries" values={form.preferredIndustries} onChange={(value) => update('preferredIndustries', value)} error={errors.preferredIndustries} placeholder="e.g. FinTech"/><ChipEditor label="Required skills" values={form.requiredSkills} onChange={(value) => update('requiredSkills', value)} error={errors.requiredSkills} placeholder="e.g. React"/><ChipEditor label="Preferred skills" values={form.preferredSkills} onChange={(value) => update('preferredSkills', value)} error={errors.preferredSkills} placeholder="e.g. TypeScript"/><label className="field"><span>Experience level</span><select value={form.experienceLevel} onChange={(event) => update('experienceLevel', event.target.value)}><option value="student">Student</option><option value="entry">Entry level</option><option value="junior">Junior</option><option value="mid">Mid level</option><option value="senior">Senior</option></select>{errors.experienceLevel && <small>{errors.experienceLevel}</small>}</label><Choice label="Willing to relocate?" value={String(form.willingToRelocate)} options={[["true", 'Yes'], ["false", 'No']]} onChange={(value) => update('willingToRelocate', value === 'true')}/><nav className="actions"><button className="button secondary" type="button" onClick={onCancel}>Cancel</button><button className="button" disabled={saving}>{saving ? 'Saving locally…' : 'Save preferences'}</button></nav></form></section></main>
}

function Choice({ label, value, options, onChange }) { return <fieldset className="choice"><legend>{label}</legend><div>{options.map(([optionValue, optionLabel]) => <label key={optionValue}><input type="radio" checked={value === optionValue} onChange={() => onChange(optionValue)} /> {optionLabel}</label>)}</div></fieldset> }
export default App
