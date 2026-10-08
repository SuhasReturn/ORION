import { useState, useEffect } from 'react'

const API = 'http://localhost:5000/api'
const CONTACT_TYPES = [
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
]

function ContactCard({ contact, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this contact?')) return
    setDeleting(true)
    try {
      const response = await fetch(`${API}/contacts/${contact.id}`, { method: 'DELETE' })
      if (response.ok) onDelete(contact.id)
    } catch { /* silently fail */ } finally { setDeleting(false) }
  }

  return (
    <article className="contact-card">
      <div className="contact-header">
        <div className="contact-avatar">{contact.name.charAt(0).toUpperCase()}</div>
        <div>
          <h3 className="contact-name">{contact.name}</h3>
          {contact.role && <p className="contact-role">{contact.role}</p>}
        </div>
        <span className="badge badge-contact-type">{contact.type || 'other'}</span>
      </div>
      <div className="contact-details">
        {contact.email && <p>📧 {contact.email}</p>}
        {contact.phone && <p>📱 {contact.phone}</p>}
        {contact.profileUrl && <p><a href={contact.profileUrl} target="_blank" rel="noopener noreferrer">🔗 Profile</a></p>}
        {contact.company && <p>🏢 {contact.company.name}</p>}
        {contact.job && <p>💼 {contact.job.normalizedTitle || contact.job.title}</p>}
      </div>
      {contact.notes && <p className="contact-notes">{contact.notes}</p>}
      <div className="contact-actions">
        <button className="button secondary" onClick={() => onEdit(contact)}>Edit</button>
        <button className="button secondary danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </article>
  )
}

function ContactForm({ existing, onSaved, onCancel }) {
  const blank = { name: '', email: '', phone: '', role: '', type: 'other', profileUrl: '', notes: '', companyId: '', jobId: '' }
  const [form, setForm] = useState(existing ? {
    name: existing.name || '',
    email: existing.email || '',
    phone: existing.phone || '',
    role: existing.role || '',
    type: existing.type || 'other',
    profileUrl: existing.profileUrl || '',
    notes: existing.notes || '',
    companyId: existing.companyId || '',
    jobId: existing.jobId || '',
  } : blank)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const update = (key, value) => { setForm({ ...form, [key]: value }); setErrors({ ...errors, [key]: undefined }) }

  const save = async (event) => {
    event.preventDefault()
    setMessage('')
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Name is required.'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Enter a valid email.'
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return }

    setSaving(true)
    try {
      const url = existing ? `${API}/contacts/${existing.id}` : `${API}/contacts`
      const method = existing ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        setErrors(data.errors ?? {})
        setMessage(data.message || 'Could not save contact.')
        return
      }
      onSaved(data.contact)
    } catch {
      setMessage('Backend unavailable.')
    } finally { setSaving(false) }
  }

  return (
    <form className="contact-form" onSubmit={save}>
      <h3>{existing ? 'Edit Contact' : 'Add Contact'}</h3>
      {message && <p className="message">{message}</p>}
      <label className="field"><span>Name</span><input value={form.name} onChange={(e) => update('name', e.target.value)} />{errors.name && <small>{errors.name}</small>}</label>
      <label className="field"><span>Email <em>Optional</em></span><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />{errors.email && <small>{errors.email}</small>}</label>
      <label className="field"><span>Phone <em>Optional</em></span><input value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label>
      <label className="field"><span>Role <em>Optional</em></span><input value={form.role} onChange={(e) => update('role', e.target.value)} placeholder="e.g. Technical Recruiter" /></label>
      <label className="field"><span>Type</span>
        <select value={form.type} onChange={(e) => update('type', e.target.value)}>
          {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <label className="field"><span>Profile URL <em>Optional</em></span><input value={form.profileUrl} onChange={(e) => update('profileUrl', e.target.value)} placeholder="https://linkedin.com/in/..." /></label>
      <label className="field full"><span>Notes <em>Optional</em></span><textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} /></label>
      <nav className="actions">
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
        <button className="button" disabled={saving}>{saving ? 'Saving…' : existing ? 'Update' : 'Add Contact'}</button>
      </nav>
    </form>
  )
}

export function ContactsSection() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API}/contacts`)
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      }
    } catch { /* silently fail */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchContacts() }, [])

  const handleSaved = (contact) => {
    if (editTarget) {
      setContacts(contacts.map(c => c.id === contact.id ? contact : c))
    } else {
      setContacts([contact, ...contacts])
    }
    setShowForm(false)
    setEditTarget(null)
  }

  const handleDelete = (id) => {
    setContacts(contacts.filter(c => c.id !== id))
  }

  const handleEdit = (contact) => {
    setEditTarget(contact)
    setShowForm(true)
  }

  if (showForm) {
    return (
      <section className="contacts-section card">
        <ContactForm
          existing={editTarget}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditTarget(null) }}
        />
      </section>
    )
  }

  return (
    <section className="contacts-section card" id="contacts-section">
      <header className="contacts-header">
        <div>
          <p className="eyebrow">MODULE 10 · CONTACT MANAGEMENT</p>
          <h2>Contacts</h2>
          <p className="muted">Track recruiters, hiring managers, and professional connections.</p>
        </div>
        <button className="button" onClick={() => { setEditTarget(null); setShowForm(true) }}>
          + Add Contact
        </button>
      </header>

      {loading ? (
        <div className="jobs-loading">
          <span className="spinner large" />
          <p className="muted">Loading contacts…</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="jobs-empty-state">
          <div className="empty-icon">👤</div>
          <h3>No Contacts Yet</h3>
          <p className="muted">Add recruiters, hiring managers, or referrals to track your professional network.</p>
        </div>
      ) : (
        <div className="contacts-grid">
          {contacts.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
