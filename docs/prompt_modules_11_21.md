# ORION: IMPLEMENT ALL REMAINING MODULES — START DIRECTLY FROM MODULE 11

## 1. PROJECT CONTEXT

Project name: ORION  
Full name: Opportunity & Recruitment Intelligence Operations Network  
Project path: `D:\ORION`  
Platform: Windows  
Backend: Node.js + Express  
Frontend: React + Vite  
Database: Local SQLite  
ORM: Prisma  
Optional AI: Local Ollama

You are continuing development of an existing project. This is not a new project.

**START DIRECTLY FROM MODULE 11. IMPLEMENT MODULES 11–21 IN ORDER.**

Do not rebuild Modules 0–10. Do not replace the existing application with a new implementation. Do not create a new repository, frontend, backend, or database.

The previous implementation report says Modules 0–10 are complete and that 80 tests passed across 20 suites. Treat this as reported status, not independent proof. Inspect the existing repository and verify the relevant interfaces before building on them.

Your responsibility is to implement the remaining product functionality and verify that the finished system actually works.

---

## 2. EXISTING FUNCTIONALITY TO PRESERVE

The existing project reportedly contains:

- Module 0: Project foundation
- Module 1: Local SQLite database and Prisma
- Module 2: Candidate profile and onboarding
- Module 3: Job preferences
- Module 4: Job discovery
- Module 5: Job normalization and deduplication
- Module 6: Job filtering
- Module 7: Deterministic job matching and scoring
- Module 8: Optional local AI through Ollama
- Module 9: Job CRM
- Module 10: Contact management

The existing pipeline is intended to be:

Job Sources
→ Discovery
→ Normalization
→ Deduplication
→ Filtering
→ Matching and Scoring
→ Optional Local AI
→ Job CRM
→ Contact CRM

Existing files reportedly include:

- `server/src/server.js`
- `server/prisma/schema.prisma`
- `client/src/App.jsx`
- `client/src/components/JobsSection.jsx`
- `client/src/components/JobDetailPanel.jsx`
- `client/src/components/ContactsSection.jsx`
- Services for job normalization, filtering, matching and Ollama
- Existing automated tests
- `docs/modules-5-10.md`

These are starting references, not a guaranteed complete inventory. Inspect the real repository before editing.

### Mandatory first step

Before implementation:

1. Inspect the root directory and package scripts.
2. Inspect the existing Prisma schema and migration history.
3. Inspect the actual APIs, service modules, React components and tests.
4. Run the existing backend tests and frontend production build.
5. Verify Prisma validation and migration status using the working Node.js 22 runtime.
6. Identify broken or incomplete integration points that would block Modules 11–21.
7. Record the baseline results.
8. Create a short implementation checklist for Modules 11–21.

Do not spend time reimplementing Modules 0–10. Fix a pre-existing issue only when it blocks a required feature, and document the fix.

After the audit, **continue directly with Module 11 in the same development session**. Do not stop merely to report the audit.

---

## 3. NON-NEGOTIABLE ARCHITECTURE AND PRIVACY RULES

### Local-first architecture

Keep ORION local-first.

- SQLite remains the database.
- Resume files remain on the local filesystem.
- Do not introduce MongoDB Atlas or another hosted database.
- Do not introduce paid AI APIs.
- Do not upload resumes, candidate profiles, contact records, or private job-search data to cloud AI services.
- Ollama remains optional and local.
- The application must continue to function without Ollama.
- External network access must be limited to explicit features that require it, such as approved email sending or permitted public job sources.

### Outreach safety

- Never send a message automatically merely because AI generated it.
- Every outbound message must pass through an explicit user approval workflow.
- Email sending requires an explicit user action after reviewing the final message.
- Do not automate LinkedIn login, messaging, scraping, or other restricted interactions.
- LinkedIn outreach should be a manually completed action by the user.
- Do not bypass CAPTCHAs, authentication, access controls, or source restrictions.
- Do not fabricate job details, contact information, personal relationships, achievements, or resume qualifications.
- Never send repeated follow-ups without user-configured rules and appropriate safeguards.

### Engineering quality

- Reuse existing conventions.
- Keep services modular.
- Validate all API inputs.
- Use structured error responses.
- Avoid duplicated business logic.
- Avoid large monolithic components and service files.
- Keep secrets out of source control.
- Add automated tests for new behavior.
- Do not claim a feature is complete without evidence.

---

# MODULE 11 — AI MESSAGE GENERATION

## Objective

Generate personalized, professional outreach drafts for recruiters, hiring managers, employees, and referral contacts using existing candidate, job, company and contact information.

This module creates drafts only. Sending belongs to Module 13 and requires Module 12 approval.

## 11.1 Inspect existing models

Reuse the existing:

- CandidateProfile
- Skill
- Job
- Company
- Contact
- JobPreference
- Outreach

Inspect the actual relationships before adding fields or models.

Avoid duplicating data that is already available.

## 11.2 Supported message types

Support at least:

1. Recruiter outreach
2. Hiring-manager outreach
3. Employee networking request
4. Referral request
5. Job-specific application-interest email
6. Follow-up draft, using existing outreach history where available

LinkedIn messages should be copyable drafts for manual sending.

## 11.3 Generation inputs

Use relevant verified data:

- Candidate name and professional background
- Candidate skills and experience
- Job title and job description
- Company name
- Contact name and role, when known
- Relevant matching skills
- Genuine candidate achievements supplied by the user
- Previous outreach history, where relevant
- Requested tone and message type

Never invent an achievement, qualification, shared connection, referral promise, job fact, or personal detail.

If essential information is missing, omit it or ask the user to provide it. Do not fill gaps with fabricated claims.

## 11.4 Local AI strategy

Use the existing `aiService` abstraction.

Preferred behavior:

1. Use Ollama when configured and available.
2. Validate and sanitize generated output.
3. Apply reasonable input and output limits.
4. Handle timeout, unavailable service and malformed output.
5. Provide a deterministic template-based fallback when feasible.
6. Clearly identify whether a draft was generated by local AI or a template.

Do not make an external paid AI API a fallback.

## 11.5 User controls

Provide controls for:

- Message type
- Recipient/contact
- Related job
- Tone: professional, friendly or concise
- Length: short, medium or detailed
- Additional user-provided context
- Generate draft
- Regenerate draft
- Edit draft
- Copy draft

Show the final message before it enters the approval queue.

## 11.6 Persistence

Persist generated drafts through the existing Outreach model or a carefully designed extension.

Store relevant information such as:

- Contact and job references
- Message type and channel
- Subject, when applicable
- Draft body
- Generation source
- Current state
- Creation and update timestamps

Do not store unnecessary copies of the resume or full candidate profile in each message.

## 11.7 API

Implement endpoints consistent with existing conventions, for example:

- `POST /api/outreach/generate`
- `GET /api/outreach`
- `GET /api/outreach/:id`
- `PUT /api/outreach/:id`

Generation must create or update a draft only; it must never send it.

## 11.8 Tests

Test:

- Every supported message type
- Missing recipient or job data
- Unavailable Ollama
- Malformed AI output
- Fallback generation
- Draft persistence
- Editing and regeneration
- No invented facts in deterministic templates
- No outbound messages sent during generation

## Deliverable

A working message-generation workflow integrated with the existing job and contact records.

Create `docs/ai-message-generation.md`.

---

# MODULE 12 — OUTREACH APPROVAL SYSTEM

## Objective

Create a clear approval queue that prevents unreviewed or unapproved outbound communication.

## 12.1 State machine

Implement an explicit state machine using the existing schema where possible.

Suggested states:

- draft
- pending_approval
- approved
- rejected
- sending
- sent
- failed
- cancelled

Define permitted transitions.

Examples:

- draft → pending_approval
- pending_approval → approved
- pending_approval → rejected
- approved → sending
- approved → cancelled
- sending → sent or failed

Only valid transitions may occur.

Do not allow a rejected message to be sent without editing and resubmitting it for approval.

## 12.2 Approval UI

Create an Outreach/Approval section showing:

- Recipient
- Company
- Related job
- Channel
- Subject
- Message body
- Current state
- Creation time
- Last modified time

Provide actions:

- Edit
- Submit for approval
- Approve
- Reject
- Cancel
- Copy for manual sending

Require the user to review the final content before approval.

## 12.3 Approval integrity

Approval must apply to the exact version of the message the user reviewed.

If an approved message is edited, invalidate the old approval and return the message to an appropriate draft or pending-approval state.

Record approval timestamps and relevant state transitions.

Because this is a single-user local application, avoid introducing an unnecessary enterprise permissions system. Still, validate every state transition on the backend.

## 12.4 API

Implement appropriate endpoints, for example:

- `GET /api/outreach/approval-queue`
- `POST /api/outreach/:id/submit`
- `POST /api/outreach/:id/approve`
- `POST /api/outreach/:id/reject`
- `POST /api/outreach/:id/cancel`

Use the project's existing naming conventions if equivalent endpoints already exist.

## 12.5 Tests

Test:

- Valid and invalid transitions
- Edited approved message invalidation
- Rejected message cannot be sent
- Cancelled message cannot be sent
- Duplicate approval requests
- Concurrent state updates where relevant
- Approval queue filtering
- Persistence after restart

## Deliverable

A reliable approval gate between message generation and outbound communication.

Create `docs/outreach-approval.md`.

---

# MODULE 13 — EMAIL INTEGRATION

## Objective

Integrate Gmail for explicitly approved email sending while preserving local storage and secure authentication.

## 13.1 Inspect existing capabilities

Check whether an email integration or OAuth configuration already exists.

Reuse it if appropriate. Do not add duplicate integrations.

## 13.2 Gmail OAuth

Use the official supported Gmail API and OAuth flow.

Requirements:

- Request only the scopes necessary for the implemented features.
- Prefer the narrowest practical scope for sending messages.
- Do not request broad mailbox access unless a later, explicitly approved feature requires it.
- Do not collect the user's Google password.
- Do not place OAuth client secrets or refresh tokens in source code.
- Keep secrets out of Git.
- Store tokens securely using an appropriate Windows-protected local credential store or equivalent mechanism.
- If secure token storage is unavailable, explain the limitation and provide a safe configuration path rather than storing secrets as ordinary plaintext application data.
- Provide clear connect, connection-status and disconnect controls.

Do not attempt to bypass Google consent or verification requirements.

## 13.3 Email composition

Support:

- Recipient email
- Subject
- Plain-text message body
- Optional HTML body only if properly sanitized and necessary
- Related contact/job/outreach record

Validate addresses and prevent header injection.

Do not automatically include attachments or resumes.

## 13.4 Sending safeguards

Before sending:

1. Confirm the message exists.
2. Confirm its state is approved.
3. Confirm the approved content still matches the content to be sent.
4. Confirm the recipient is valid.
5. Confirm the user explicitly initiated sending.
6. Mark the message as sending safely.
7. Submit it through Gmail.
8. Persist the result and provider message identifier when available.

Prevent double-clicks or retries from sending duplicate emails. Use an idempotency mechanism or a reliable sending-state transition.

If the provider result is uncertain, mark the state appropriately and require reconciliation before retrying. Do not blindly send again.

Never send pending, rejected, cancelled or modified-after-approval messages.

## 13.5 Email settings

Provide:

- Connection status
- Connect Gmail
- Disconnect Gmail
- Test/configuration status
- Clear error messages
- Safe handling of expired/revoked tokens

Do not send a test email without the user's explicit confirmation.

## 13.6 Tests

Use mocks for the Gmail API.

Test:

- OAuth callback validation
- State/CSRF protection
- Invalid and expired credentials
- Disconnect behavior
- Approved message sends
- Unapproved message is blocked
- Edited message is blocked until reapproval
- Duplicate send prevention
- API failures and uncertain outcomes
- No credentials in logs
- No secret data in Git

## Deliverable

Explicitly approved Gmail sending with safe local credential handling.

Create `docs/email-integration.md`.

---

# MODULE 14 — FOLLOW-UP ENGINE

## Objective

Provide controlled reminders and follow-up management for existing outreach records.

This is a local scheduler, not an uncontrolled automatic messaging system.

## 14.1 Follow-up model

Inspect and reuse the existing FollowUp model.

Store information such as:

- Related outreach
- Related contact and job when applicable
- Due date/time
- Status
- Attempt number
- Notes
- Completion timestamp
- Created and updated timestamps

Use the user's local timezone consistently and document how timestamps are stored.

## 14.2 Follow-up rules

Allow the user to configure a suggested follow-up date.

Support reminders for:

- No response after a chosen interval
- A scheduled follow-up
- A manually created follow-up
- A follow-up that is completed, cancelled or postponed

Do not assume every recipient should receive another message.

## 14.3 Reply handling

Do not claim to detect email replies unless reply retrieval has actually been implemented and authorized.

For the initial implementation, support:

- Manual response recording
- Manual marking of a conversation as replied
- Cancelling or closing pending follow-ups after a response

If authorized Gmail read access is implemented later, treat it as an optional feature requiring explicit consent and additional scopes.

## 14.4 Scheduling

Use a lightweight local Node scheduler compatible with the existing project.

Requirements:

- No cloud scheduler
- No duplicate scheduled tasks after restart
- Persist reminders in SQLite
- Reconcile overdue reminders on startup
- Avoid sending emails from the scheduler without explicit approval
- Handle application shutdown cleanly

The default action should be a reminder or a draft suggestion, not automatic sending.

## 14.5 API and UI

Implement appropriate endpoints:

- `GET /api/follow-ups`
- `POST /api/follow-ups`
- `PUT /api/follow-ups/:id`
- `POST /api/follow-ups/:id/complete`
- `POST /api/follow-ups/:id/cancel`

Add a Follow-ups view with due, upcoming, overdue and completed filters.

## 14.6 Tests

Test:

- Date calculations
- Timezone handling
- Restart/reconciliation behavior
- Duplicate scheduling prevention
- Completed/cancelled follow-ups
- Reply closes relevant reminders
- No unauthorized sending
- Persistence and overdue handling

## Deliverable

A dependable local follow-up manager.

Create `docs/follow-up-engine.md`.

---

# MODULE 15 — COMPLETE APPLICATION TRACKING

## Objective

Make the application lifecycle consistent across jobs, applications, outreach and interviews.

Do not create a second application system if Module 9 already has the required model.

## 15.1 Inspect existing schema

Inspect Application and existing job CRM status fields.

Choose one authoritative application record per user/job according to the existing schema.

Preserve the existing unique user/job constraint if present.

If the current CRM has job statuses but no reliable Application record, connect these cleanly rather than duplicating statuses in unrelated tables.

## 15.2 Lifecycle

Support a documented lifecycle such as:

- interested
- preparing
- applied
- assessment
- interview
- offer
- rejected
- withdrawn
- archived

Use the project's established status conventions if they already exist.

Define valid transitions where appropriate.

## 15.3 Application information

Track relevant information:

- Related job
- Application status
- Application date
- Last updated date
- Source
- Resume/reference used, if supported
- Relevant notes
- Next action
- Interview dates and notes
- Offer details entered by the user
- Rejection/withdrawal notes

Do not collect sensitive information that is not necessary.

## 15.4 Activity history

Implement a lightweight application activity timeline if the existing models can support it cleanly.

Record meaningful events such as:

- Application created
- Status changed
- Interview scheduled
- Interview completed
- Offer recorded
- Application withdrawn

Do not fabricate historical events for existing records.

## 15.5 API

Support endpoints consistent with the current backend:

- `GET /api/applications`
- `GET /api/applications/:id`
- `POST /api/applications`
- `PUT /api/applications/:id`
- `POST /api/applications/:id/status`
- Appropriate activity-history endpoints if required

Validate job references and prevent duplicate applications for the same user/job.

## 15.6 UI

Provide:

- Application list
- Status filters
- Application detail panel
- Status-change controls
- Notes and next actions
- Interview dates
- Timeline
- Links to the original job and related contacts

## 15.7 Tests

Test lifecycle transitions, duplicate prevention, date validation, persistence, activity history and consistency with existing CRM statuses.

## Deliverable

A complete and consistent application-tracking workflow.

Create `docs/application-tracking.md`.

---

# MODULE 16 — UNIFIED DASHBOARD

## Objective

Turn the existing ORION interface into a useful unified dashboard.

Do not replace the whole frontend with a new design or framework.

## 16.1 Dashboard summary

Display real data from existing APIs:

- Total discovered jobs
- Eligible jobs
- Strong/excellent matches
- Saved jobs
- Applications by status
- Upcoming interviews
- Pending outreach approvals
- Sent outreach messages
- Upcoming and overdue follow-ups
- Contacts

Do not display hard-coded counts or fake statistics.

## 16.2 Quick actions

Provide links/actions for:

- Discover jobs
- Run the normalization/filtering/matching pipeline
- View high-scoring jobs
- View saved jobs
- Add a contact
- Generate an outreach draft
- Review approval queue
- View applications
- View upcoming follow-ups

All actions must call real APIs and report their outcomes.

## 16.3 UX

Include:

- Loading states
- Empty states
- Recoverable error states
- Clear navigation
- Responsive layout
- Accessible labels and keyboard interaction
- Confirmation for destructive actions

Avoid unnecessary animation or large dependency additions.

## 16.4 API

Reuse existing endpoints. Add a dashboard summary endpoint only if it materially improves performance or consistency.

Use database aggregation where practical instead of downloading every record to calculate simple totals.

## 16.5 Tests

Test dashboard aggregation, empty database behavior, API errors and consistency between summary counts and underlying records.

## Deliverable

A data-driven dashboard that reflects actual local records.

Create or update `docs/dashboard.md`.

---

# MODULE 17 — ANALYTICS

## Objective

Provide transparent job-search and outreach analytics from actual local data.

## 17.1 Metrics

Support metrics such as:

- Jobs discovered over time
- Jobs shortlisted
- Applications submitted
- Applications by status
- Interviews received
- Offers received
- Outreach drafts created
- Messages approved and sent
- Responses manually recorded or verified through an authorized integration
- Follow-ups completed
- Application conversion rates
- Outreach response rates, where the denominator is meaningful

Define every metric clearly.

For example, do not calculate a response rate using draft messages as though they were sent.

Do not interpret missing reply data as zero replies if reply tracking has not been enabled.

## 17.2 Time ranges

Support sensible ranges such as:

- Last 7 days
- Last 30 days
- Last 90 days
- All time
- Custom date range, if practical

Use a consistent timezone and date-boundary convention.

## 17.3 Visualization

Use the existing frontend charting solution if one exists.

Otherwise, choose a small, maintained dependency only if needed.

Provide accessible labels and a tabular or textual alternative to charts.

Do not add decorative charts without useful information.

## 17.4 API

Implement endpoints such as:

- `GET /api/analytics/overview`
- `GET /api/analytics/applications`
- `GET /api/analytics/outreach`
- `GET /api/analytics/jobs`

Use date filters and aggregation queries.

## 17.5 Tests

Test formulas, date ranges, zero-denominator behavior, empty datasets, time boundaries and consistency with stored records.

## Deliverable

A useful analytics section based only on real data.

Create `docs/analytics.md`.

---

# MODULE 18 — BACKUP AND RESTORE

## Objective

Protect the local SQLite database and uploaded resume files.

This is a high-risk module. Implement and test it conservatively.

## 18.1 Backup scope

Back up:

- SQLite database
- Required local uploaded files
- Relevant metadata needed for restoration

Do not include:

- `node_modules`
- Frontend build output unless explicitly required
- Temporary files
- Logs containing secrets
- OAuth tokens unless a separately designed secure backup mechanism is explicitly approved

## 18.2 Consistent backup

Use a SQLite-supported consistent backup mechanism.

Do not simply copy a live database file if doing so could produce an inconsistent backup.

If necessary, briefly coordinate writes or use the database's supported backup facilities.

Store backups in a user-configurable local directory outside the source-controlled project directory by default.

Use timestamped filenames.

## 18.3 Backup metadata

Include a manifest containing:

- Backup creation timestamp
- Application/schema version
- Database file name
- Included file inventory
- Backup format version
- Checksums where practical

Do not include private profile information in the manifest unless necessary.

## 18.4 Restore safeguards

Restore must:

1. Validate the selected backup.
2. Verify the manifest and checksums where available.
3. Verify the database file can be opened.
4. Validate that referenced files exist or report missing files.
5. Create a backup of the current state before replacement.
6. Stop or coordinate database writes during restore.
7. Replace data safely.
8. Reconnect Prisma/database clients correctly.
9. Verify database integrity and schema compatibility.
10. Report success or failure clearly.

Never silently overwrite the only copy of user data.

Reject malformed paths and prevent path traversal.

Do not restore arbitrary files to arbitrary locations.

## 18.5 UI

Provide:

- Create backup
- Backup destination
- List available backups
- Backup details
- Restore preview
- Restore confirmation
- Restore progress/result
- Clear error messages

Require explicit confirmation before restoring.

## 18.6 Tests

Test backup creation, manifest validation, corrupted backups, interrupted operations where practical, missing files, safe restore, pre-restore backup, path traversal and database integrity.

Use temporary test directories and disposable test databases. Never run destructive tests against the user's real database.

## Deliverable

Reliable local backup and restore.

Create `docs/backup-restore.md`.

---

# MODULE 19 — SECURITY AND PRIVACY HARDENING

## Objective

Review the full local application for realistic security and privacy risks before packaging it.

This is a security-hardening module, not a reason to rewrite the architecture.

## 19.1 API validation

Audit all endpoints for:

- Input validation
- Safe database access
- Proper error responses
- Oversized request protection
- Invalid identifiers
- Path traversal
- Unsafe file handling
- Unsafe URL handling
- Unexpected content types
- Excessive query sizes
- Accidental exposure of stack traces or secrets

Use existing validation libraries where appropriate; avoid unnecessary dependencies.

## 19.2 Local API access

Determine how the server binds and how the frontend reaches it.

If the application is intended for a single local user:

- Bind to loopback by default.
- Do not expose the API to the local network unless explicitly configured.
- Restrict sensitive operations appropriately.
- Apply appropriate CORS protections.
- Protect state-changing requests against applicable cross-origin risks.
- Do not assume that a locally running API is automatically inaccessible to malicious websites.

Document the local threat model.

## 19.3 File upload security

Audit resume uploads:

- Type and size checks
- Server-generated filenames
- No arbitrary filesystem paths
- Safe storage directory
- Safe download/view behavior
- No public exposure of uploaded files
- Appropriate error handling

## 19.4 Secrets and OAuth

Ensure:

- No secrets committed to Git
- Environment files ignored where appropriate
- OAuth tokens stored using a secure local mechanism
- Tokens excluded from ordinary logs
- Disconnect revokes or clears local credentials appropriately
- Sensitive configuration is not returned by status APIs

## 19.5 Logging and privacy

Avoid logging resumes, full contact records, access tokens or complete sensitive message bodies unnecessarily.

Provide understandable local data and integration controls.

Do not claim that data is encrypted at rest unless actual encryption is implemented and verified.

Document what remains unencrypted and any relevant OS-level protections.

## 19.6 Dependencies

Audit dependencies and scripts.

- Remove unnecessary dependencies.
- Check for known vulnerabilities using the available package tooling.
- Avoid blindly applying breaking major-version upgrades.
- Fix relevant vulnerabilities where feasible.
- Report anything unresolved.

## 19.7 Data deletion

Provide safe deletion behavior for user-created contacts, drafts, notes and other appropriate records.

Respect foreign-key relationships and explain what is retained or removed.

Do not silently delete application history or files that other records still reference.

## 19.8 Tests

Add regression tests for security-sensitive behavior, including path traversal, invalid input, unauthorized network binding where testable, secret redaction and file access restrictions.

## Deliverable

A documented security review, implemented fixes and a list of remaining risks.

Create `docs/security-privacy.md`.

---

# MODULE 20 — WINDOWS DESKTOP PACKAGING

## Objective

Package ORION as a usable Windows desktop application while preserving the local-first architecture.

## 20.1 Inspect packaging options

Inspect the current application structure and evaluate a suitable packaging solution such as Electron or Tauri.

Choose one based on compatibility with the existing React/Vite frontend and Express backend.

Do not introduce both.

Do not begin packaging until Modules 11–19 are implemented and their tests pass, except for preparatory investigation.

## 20.2 Desktop behavior

The packaged application should:

- Open a desktop window
- Start the local backend safely
- Use the existing SQLite database
- Store persistent user data in an appropriate per-user application-data directory
- Store uploaded files and backups in appropriate local locations
- Stop background processes cleanly on exit
- Handle startup failures clearly
- Avoid launching duplicate backend instances
- Keep logs in a suitable local location
- Provide a documented development mode

Do not store the production database inside a directory that may be replaced during an application update.

Do not assume the development path `D:\ORION` will exist on another computer.

## 20.3 Security

- Keep the desktop application isolated from unnecessary operating-system capabilities.
- Use secure window settings and restrictive permissions.
- Do not expose broad Node.js access to untrusted renderer content.
- Validate IPC messages if Electron is selected.
- Keep external navigation controlled.
- Do not expose secrets in frontend bundles.
- Keep local data separate from application binaries.

## 20.4 Packaging and installation

Provide:

- Development startup instructions
- Production build instructions
- Windows package or installer configuration
- Version information
- App icon configuration if assets are available
- Clear first-run behavior
- Upgrade and data-preservation notes
- Uninstall behavior that does not silently erase user data

Do not claim an installer works unless it has been built and tested.

## 20.5 Tests

Verify frontend build, backend startup, packaged-app configuration, persistent data paths, clean shutdown and that existing local data is not overwritten by an application update.

If full GUI testing is unavailable, state the limitation explicitly.

## Deliverable

A reproducible Windows packaging workflow and documented installation instructions.

Create `docs/desktop-packaging.md`.

---

# MODULE 21 — GITHUB RELEASE

## Objective

Prepare a clean, documented and reproducible public release of ORION.

Do not publish, push, create a release, or expose private information without explicit authorization.

## 21.1 Repository hygiene

Inspect Git status and repository history.

Ensure the repository does not contain:

- `.env` files with secrets
- OAuth credentials
- SQLite database files
- Real user profiles
- Uploaded resumes
- Personal contact data
- Local backups
- Logs containing sensitive data
- Build artifacts that should not be tracked

Review `.gitignore`.

Do not delete existing user work or rewrite history without explicit authorization.

If a secret has already been committed, report the exposure and recommend revocation/rotation. Removing the current file alone may not remove it from Git history.

## 21.2 Documentation

Update the main README with:

- What ORION does
- Features
- Architecture diagram
- Technology stack
- Local-first/privacy approach
- Prerequisites
- Supported Node.js version
- Installation
- Development startup
- Database initialization
- Ollama setup, optional
- Gmail OAuth setup, optional
- Windows packaging
- Backup and restore
- Tests
- Known limitations
- Troubleshooting
- License status

Do not claim a license has been chosen if it has not. Ask before adding a license that changes reuse rights.

## 21.3 Setup experience

Make a new local installation reproducible:

1. Clone repository.
2. Install dependencies.
3. Configure supported environment variables.
4. Initialize the local database through documented migrations.
5. Generate Prisma Client.
6. Start the application.
7. Complete candidate onboarding.
8. Configure preferences.
9. Optionally connect Ollama and Gmail.
10. Create a backup.

Do not seed real or fake candidate data by default.

## 21.4 Automated checks

Provide or improve a release-check script that verifies:

- Required runtime version
- Dependency installation state
- Prisma validation
- Prisma Client generation
- Migration status
- Backend test suite
- Frontend production build
- Secret and local-data exclusion checks where practical

Do not run destructive database commands in release checks.

## 21.5 Release preparation

Prepare:

- Version number
- Changelog
- Release notes
- Installation instructions
- Known issues
- Build artifacts if successfully generated

Do not push to GitHub or publish a release unless explicitly authorized.

## 21.6 Final tests

Test a clean setup using a disposable database and temporary local-data directory. Confirm the documented steps are accurate.

## Deliverable

A release-ready repository and reproducible release checklist.

Create or update:

- `README.md`
- `CHANGELOG.md`
- `docs/installation.md`
- `docs/release-checklist.md`

---

# 4. DATABASE AND MIGRATION SAFETY — MANDATORY FOR ALL MODULES

The database contains local user data. Treat it as valuable.

Before changing the Prisma schema:

1. Inspect the current schema.
2. Inspect existing migrations.
3. Confirm current migration status.
4. Create a timestamped backup of the current SQLite database using a consistent backup mechanism.
5. Record the backup path.
6. Make additive schema changes where practical.
7. Create a new migration with a descriptive name.
8. Generate Prisma Client.
9. Verify migration status and database integrity.

Never:

- Run `prisma migrate reset`.
- Delete or recreate the existing database.
- Modify the original `0_init` migration.
- Rewrite completed historical migrations.
- Delete `_prisma_migrations`.
- Manually rewrite migration history to hide a failure.
- Seed fake candidate/profile/preference records in the real database.
- Use destructive test fixtures against the user's real database.

If a migration fails, stop and diagnose the cause. Preserve the database and report the exact failure.

Use the project's existing Prisma version and migration conventions.

## Node.js runtime

Use the working Node.js 22 runtime:

`C:\Tools\node-v22\node-v22.19.0-win-x64`

Expected versions:

- Node.js 22.19.0
- npm 10.9.3
- Prisma 6.19.3

If a new PowerShell session defaults to another Node version, prepend the working runtime path:

`$env:Path = 'C:\Tools\node-v22\node-v22.19.0-win-x64;' + $env:Path`

Verify `node -v` and `npm -v` before Prisma operations.

---

# 5. TESTING STRATEGY

Each module must have meaningful automated tests.

Use:

- Unit tests for business logic
- API integration tests
- Mocked Gmail/Ollama integrations
- Temporary SQLite databases for database integration tests
- Frontend tests if a suitable test framework already exists
- Manual checks where automation is impractical

Do not count test files as proof of correctness. Inspect test coverage for meaningful assertions.

Important end-to-end scenarios:

### Scenario A — Generate and approve outreach

1. Select a real stored job.
2. Select a real stored contact.
3. Generate an outreach draft.
4. Edit the message.
5. Submit for approval.
6. Approve the exact final content.
7. Verify the message cannot be sent if edited afterward without reapproval.

### Scenario B — Email sending

1. Verify the Gmail integration is disconnected by default.
2. Verify an unapproved message cannot be sent.
3. Verify an approved message can be sent only after explicit user action and valid OAuth setup.
4. Verify duplicate sends are prevented.
5. Verify errors do not expose credentials.

Do not send a real email during automated testing.

### Scenario C — Follow-up

1. Create an outreach record.
2. Schedule a follow-up.
3. Verify persistence after restart.
4. Mark the contact as having replied.
5. Verify the relevant follow-up is cancelled or closed appropriately.

### Scenario D — Application tracking

1. Select a stored job.
2. Create an application.
3. Change the application status.
4. Record an interview.
5. Verify the activity timeline and dashboard counts.

### Scenario E — Backup and restore

1. Use a disposable database.
2. Create a backup.
3. Modify disposable records.
4. Restore the backup.
5. Verify database integrity and file references.
6. Verify that a pre-restore backup exists.

### Scenario F — Desktop and release

1. Build the frontend.
2. Start the backend.
3. Verify persistent local data paths.
4. Verify a new local setup follows the documentation.
5. Verify local databases, resumes, backups and secrets are excluded from Git.

Do not fabricate test data in the actual user database. Use disposable fixtures and mocks.

---

# 6. INTEGRATION REQUIREMENTS

All modules must work together rather than existing as isolated pages.

The expected final user journey is:

1. User discovers jobs.
2. ORION normalizes and deduplicates them.
3. ORION filters and scores jobs against preferences.
4. User reviews matches and manages opportunities.
5. User manages recruiter and employee contacts.
6. User generates a personalized outreach draft.
7. User edits and submits the draft for approval.
8. User approves the exact message.
9. User explicitly sends it through the configured email integration or copies it for manual LinkedIn use.
10. ORION records the result.
11. User schedules follow-ups.
12. User records replies and progresses applications.
13. Dashboard and analytics reflect real records.
14. User can back up and restore local data.
15. Security controls protect local files and credentials.
16. The application can be packaged and installed on Windows.
17. The repository can be set up and tested reproducibly.

Avoid circular dependencies between services.

Avoid duplicate sources of truth for application and outreach statuses.

Use database transactions when several related records must be changed atomically.

Use idempotent operations where repeated calls could otherwise create duplicate applications, follow-ups or emails.

---

# 7. EXECUTION ORDER

Implement the work in this order:

Phase 1:
- Module 11 — AI Message Generation
- Module 12 — Outreach Approval

Phase 2:
- Module 13 — Gmail Integration
- Module 14 — Follow-up Engine
- Module 15 — Application Tracking

Phase 3:
- Module 16 — Dashboard
- Module 17 — Analytics

Phase 4:
- Module 18 — Backup and Restore
- Module 19 — Security and Privacy Hardening

Phase 5:
- Module 20 — Windows Desktop Packaging
- Module 21 — GitHub Release Preparation

At the beginning of each phase:

1. Review dependencies and relevant existing code.
2. Implement the next module in order.
3. Add tests and documentation.
4. Run the relevant tests.
5. Check regression behavior.
6. Continue to the next module when safe.

**Do not stop after the initial audit. Start implementing Module 11 immediately and continue sequentially through Module 21 in this development task.**

If the session, tool limits, or available time prevent finishing everything, leave the repository in a working state and provide an exact continuation prompt that starts from the first incomplete requirement. Do not repeat completed work.

Do not claim all modules are complete just because their files or UI pages exist.

---

# 8. FINAL VERIFICATION

At the end, run the relevant available checks, including:

- Prisma validation
- Prisma Client generation
- Migration status
- Backend automated tests
- Frontend production build
- Database health check
- Existing Module 0–10 regression tests
- New Modules 11–21 tests
- Security-sensitive integration tests
- Packaging checks, if implemented

Report the exact commands and actual results.

For email and Ollama integrations, distinguish between mocked tests and live integration tests. Never claim live Gmail sending was verified if no authorized test was performed.

For backup and restore, use a disposable database in destructive tests.

For packaging, report whether the installer was actually built and tested or only configured.

---

# 9. FINAL AUDIT REPORT

Produce a report with this title:

ORION MODULES 11–21 — FINAL IMPLEMENTATION AUDIT

For each module, use:

| Module | Requirement | Status | Evidence |
|---|---|---|---|
| 11 | AI message generation | | |
| 12 | Outreach approval | | |
| 13 | Gmail integration | | |
| 14 | Follow-up engine | | |
| 15 | Application tracking | | |
| 16 | Unified dashboard | | |
| 17 | Analytics | | |
| 18 | Backup and restore | | |
| 19 | Security and privacy | | |
| 20 | Windows desktop packaging | | |
| 21 | GitHub release preparation | | |

Use only these status values:

- Complete
- Partial
- Missing
- Broken

Then include:

1. Initial repository audit and baseline results
2. Features implemented
3. Files created
4. Files modified
5. Database changes and migration names
6. Backup paths
7. API endpoints added or modified
8. Frontend changes
9. Message-generation behavior
10. Approval-state transitions and integrity checks
11. Gmail OAuth and credential-storage approach
12. Email-send safeguards and duplicate prevention
13. Follow-up scheduling and reply handling
14. Application lifecycle and activity tracking
15. Dashboard metrics
16. Analytics definitions and formulas
17. Backup and restore verification
18. Security review findings
19. Remaining security risks
20. Tests executed and exact counts
21. Prisma migration status
22. Frontend build results
23. Module 0–10 regression results
24. Desktop packaging status
25. Release readiness
26. Known limitations
27. Exact remaining work, if any
28. The next action required from the user

Do not expose OAuth tokens, secrets, resume content, contact data or other private values in the report.

If any module is incomplete, state why and list the exact remaining requirements.

The final status must be one of:

ORION MODULES 11–21 — COMPLETE

ORION MODULES 11–21 — PARTIALLY COMPLETE

Use COMPLETE only when the required functionality has actually been implemented and verified. A configured integration, empty UI page, or mocked test alone is not sufficient evidence of full completion.

---

# FINAL INSTRUCTION

Start directly with Module 11.

Preserve all existing work from Modules 0–10.

Implement Modules 11–21 sequentially, with tests and documentation.

Do not rebuild the project.

Do not reset the database.

Do not invent data.

Do not send email without explicit user approval.

Do not publish to GitHub without explicit authorization.

Finish as much as can be safely implemented, verify the real result, and clearly report what remains.��
��# ORION: IMPLEMENT ALL REMAINING MODULES — START DIRECTLY FROM MODULE 11

## 1. PROJECT CONTEXT

Project name: ORION  
Full name: Opportunity & Recruitment Intelligence Operations Network  
Project path: `D:\ORION`  
Platform: Windows  
Backend: Node.js + Express  
Frontend: React + Vite  
Database: Local SQLite  
ORM: Prisma  
Optional AI: Local Ollama

You are continuing development of an existing project. This is not a new project.

**START DIRECTLY FROM MODULE 11. IMPLEMENT MODULES 11–21 IN ORDER.**

Do not rebuild Modules 0–10. Do not replace the existing application with a new implementation. Do not create a new repository, frontend, backend, or database.

The previous implementation report says Modules 0–10 are complete and that 80 tests passed across 20 suites. Treat this as reported status, not independent proof. Inspect the existing repository and verify the relevant interfaces before building on them.

Your responsibility is to implement the remaining product functionality and verify that the finished system actually works.

---

## 2. EXISTING FUNCTIONALITY TO PRESERVE

The existing project reportedly contains:

- Module 0: Project foundation
- Module 1: Local SQLite database and Prisma
- Module 2: Candidate profile and onboarding
- Module 3: Job preferences
- Module 4: Job discovery
- Module 5: Job normalization and deduplication
- Module 6: Job filtering
- Module 7: Deterministic job matching and scoring
- Module 8: Optional local AI through Ollama
- Module 9: Job CRM
- Module 10: Contact management

The existing pipeline is intended to be:

Job Sources
→ Discovery
→ Normalization
→ Deduplication
→ Filtering
→ Matching and Scoring
→ Optional Local AI
→ Job CRM
→ Contact CRM

Existing files reportedly include:

- `server/src/server.js`
- `server/prisma/schema.prisma`
- `client/src/App.jsx`
- `client/src/components/JobsSection.jsx`
- `client/src/components/JobDetailPanel.jsx`
- `client/src/components/ContactsSection.jsx`
- Services for job normalization, filtering, matching and Ollama
- Existing automated tests
- `docs/modules-5-10.md`

These are starting references, not a guaranteed complete inventory. Inspect the real repository before editing.

### Mandatory first step

Before implementation:

1. Inspect the root directory and package scripts.
2. Inspect the existing Prisma schema and migration history.
3. Inspect the actual APIs, service modules, React components and tests.
4. Run the existing backend tests and frontend production build.
5. Verify Prisma validation and migration status using the working Node.js 22 runtime.
6. Identify broken or incomplete integration points that would block Modules 11–21.
7. Record the baseline results.
8. Create a short implementation checklist for Modules 11–21.

Do not spend time reimplementing Modules 0–10. Fix a pre-existing issue only when it blocks a required feature, and document the fix.

After the audit, **continue directly with Module 11 in the same development session**. Do not stop merely to report the audit.

---

## 3. NON-NEGOTIABLE ARCHITECTURE AND PRIVACY RULES

### Local-first architecture

Keep ORION local-first.

- SQLite remains the database.
- Resume files remain on the local filesystem.
- Do not introduce MongoDB Atlas or another hosted database.
- Do not introduce paid AI APIs.
- Do not upload resumes, candidate profiles, contact records, or private job-search data to cloud AI services.
- Ollama remains optional and local.
- The application must continue to function without Ollama.
- External network access must be limited to explicit features that require it, such as approved email sending or permitted public job sources.

### Outreach safety

- Never send a message automatically merely because AI generated it.
- Every outbound message must pass through an explicit user approval workflow.
- Email sending requires an explicit user action after reviewing the final message.
- Do not automate LinkedIn login, messaging, scraping, or other restricted interactions.
- LinkedIn outreach should be a manually completed action by the user.
- Do not bypass CAPTCHAs, authentication, access controls, or source restrictions.
- Do not fabricate job details, contact information, personal relationships, achievements, or resume qualifications.
- Never send repeated follow-ups without user-configured rules and appropriate safeguards.

### Engineering quality

- Reuse existing conventions.
- Keep services modular.
- Validate all API inputs.
- Use structured error responses.
- Avoid duplicated business logic.
- Avoid large monolithic components and service files.
- Keep secrets out of source control.
- Add automated tests for new behavior.
- Do not claim a feature is complete without evidence.

---

# MODULE 11 — AI MESSAGE GENERATION

## Objective

Generate personalized, professional outreach drafts for recruiters, hiring managers, employees, and referral contacts using existing candidate, job, company and contact information.

This module creates drafts only. Sending belongs to Module 13 and requires Module 12 approval.

## 11.1 Inspect existing models

Reuse the existing:

- CandidateProfile
- Skill
- Job
- Company
- Contact
- JobPreference
- Outreach

Inspect the actual relationships before adding fields or models.

Avoid duplicating data that is already available.

## 11.2 Supported message types

Support at least:

1. Recruiter outreach
2. Hiring-manager outreach
3. Employee networking request
4. Referral request
5. Job-specific application-interest email
6. Follow-up draft, using existing outreach history where available

LinkedIn messages should be copyable drafts for manual sending.

## 11.3 Generation inputs

Use relevant verified data:

- Candidate name and professional background
- Candidate skills and experience
- Job title and job description
- Company name
- Contact name and role, when known
- Relevant matching skills
- Genuine candidate achievements supplied by the user
- Previous outreach history, where relevant
- Requested tone and message type

Never invent an achievement, qualification, shared connection, referral promise, job fact, or personal detail.

If essential information is missing, omit it or ask the user to provide it. Do not fill gaps with fabricated claims.

## 11.4 Local AI strategy

Use the existing `aiService` abstraction.

Preferred behavior:

1. Use Ollama when configured and available.
2. Validate and sanitize generated output.
3. Apply reasonable input and output limits.
4. Handle timeout, unavailable service and malformed output.
5. Provide a deterministic template-based fallback when feasible.
6. Clearly identify whether a draft was generated by local AI or a template.

Do not make an external paid AI API a fallback.

## 11.5 User controls

Provide controls for:

- Message type
- Recipient/contact
- Related job
- Tone: professional, friendly or concise
- Length: short, medium or detailed
- Additional user-provided context
- Generate draft
- Regenerate draft
- Edit draft
- Copy draft

Show the final message before it enters the approval queue.

## 11.6 Persistence

Persist generated drafts through the existing Outreach model or a carefully designed extension.

Store relevant information such as:

- Contact and job references
- Message type and channel
- Subject, when applicable
- Draft body
- Generation source
- Current state
- Creation and update timestamps

Do not store unnecessary copies of the resume or full candidate profile in each message.

## 11.7 API

Implement endpoints consistent with existing conventions, for example:

- `POST /api/outreach/generate`
- `GET /api/outreach`
- `GET /api/outreach/:id`
- `PUT /api/outreach/:id`

Generation must create or update a draft only; it must never send it.

## 11.8 Tests

Test:

- Every supported message type
- Missing recipient or job data
- Unavailable Ollama
- Malformed AI output
- Fallback generation
- Draft persistence
- Editing and regeneration
- No invented facts in deterministic templates
- No outbound messages sent during generation

## Deliverable

A working message-generation workflow integrated with the existing job and contact records.

Create `docs/ai-message-generation.md`.

---

# MODULE 12 — OUTREACH APPROVAL SYSTEM

## Objective

Create a clear approval queue that prevents unreviewed or unapproved outbound communication.

## 12.1 State machine

Implement an explicit state machine using the existing schema where possible.

Suggested states:

- draft
- pending_approval
- approved
- rejected
- sending
- sent
- failed
- cancelled

Define permitted transitions.

Examples:

- draft → pending_approval
- pending_approval → approved
- pending_approval → rejected
- approved → sending
- approved → cancelled
- sending → sent or failed

Only valid transitions may occur.

Do not allow a rejected message to be sent without editing and resubmitting it for approval.

## 12.2 Approval UI

Create an Outreach/Approval section showing:

- Recipient
- Company
- Related job
- Channel
- Subject
- Message body
- Current state
- Creation time
- Last modified time

Provide actions:

- Edit
- Submit for approval
- Approve
- Reject
- Cancel
- Copy for manual sending

Require the user to review the final content before approval.

## 12.3 Approval integrity

Approval must apply to the exact version of the message the user reviewed.

If an approved message is edited, invalidate the old approval and return the message to an appropriate draft or pending-approval state.

Record approval timestamps and relevant state transitions.

Because this is a single-user local application, avoid introducing an unnecessary enterprise permissions system. Still, validate every state transition on the backend.

## 12.4 API

Implement appropriate endpoints, for example:

- `GET /api/outreach/approval-queue`
- `POST /api/outreach/:id/submit`
- `POST /api/outreach/:id/approve`
- `POST /api/outreach/:id/reject`
- `POST /api/outreach/:id/cancel`

Use the project's existing naming conventions if equivalent endpoints already exist.

## 12.5 Tests

Test:

- Valid and invalid transitions
- Edited approved message invalidation
- Rejected message cannot be sent
- Cancelled message cannot be sent
- Duplicate approval requests
- Concurrent state updates where relevant
- Approval queue filtering
- Persistence after restart

## Deliverable

A reliable approval gate between message generation and outbound communication.

Create `docs/outreach-approval.md`.

---

# MODULE 13 — EMAIL INTEGRATION

## Objective

Integrate Gmail for explicitly approved email sending while preserving local storage and secure authentication.

## 13.1 Inspect existing capabilities

Check whether an email integration or OAuth configuration already exists.

Reuse it if appropriate. Do not add duplicate integrations.

## 13.2 Gmail OAuth

Use the official supported Gmail API and OAuth flow.

Requirements:

- Request only the scopes necessary for the implemented features.
- Prefer the narrowest practical scope for sending messages.
- Do not request broad mailbox access unless a later, explicitly approved feature requires it.
- Do not collect the user's Google password.
- Do not place OAuth client secrets or refresh tokens in source code.
- Keep secrets out of Git.
- Store tokens securely using an appropriate Windows-protected local credential store or equivalent mechanism.
- If secure token storage is unavailable, explain the limitation and provide a safe configuration path rather than storing secrets as ordinary plaintext application data.
- Provide clear connect, connection-status and disconnect controls.

Do not attempt to bypass Google consent or verification requirements.

## 13.3 Email composition

Support:

- Recipient email
- Subject
- Plain-text message body
- Optional HTML body only if properly sanitized and necessary
- Related contact/job/outreach record

Validate addresses and prevent header injection.

Do not automatically include attachments or resumes.

## 13.4 Sending safeguards

Before sending:

1. Confirm the message exists.
2. Confirm its state is approved.
3. Confirm the approved content still matches the content to be sent.
4. Confirm the recipient is valid.
5. Confirm the user explicitly initiated sending.
6. Mark the message as sending safely.
7. Submit it through Gmail.
8. Persist the result and provider message identifier when available.

Prevent double-clicks or retries from sending duplicate emails. Use an idempotency mechanism or a reliable sending-state transition.

If the provider result is uncertain, mark the state appropriately and require reconciliation before retrying. Do not blindly send again.

Never send pending, rejected, cancelled or modified-after-approval messages.

## 13.5 Email settings

Provide:

- Connection status
- Connect Gmail
- Disconnect Gmail
- Test/configuration status
- Clear error messages
- Safe handling of expired/revoked tokens

Do not send a test email without the user's explicit confirmation.

## 13.6 Tests

Use mocks for the Gmail API.

Test:

- OAuth callback validation
- State/CSRF protection
- Invalid and expired credentials
- Disconnect behavior
- Approved message sends
- Unapproved message is blocked
- Edited message is blocked until reapproval
- Duplicate send prevention
- API failures and uncertain outcomes
- No credentials in logs
- No secret data in Git

## Deliverable

Explicitly approved Gmail sending with safe local credential handling.

Create `docs/email-integration.md`.

---

# MODULE 14 — FOLLOW-UP ENGINE

## Objective

Provide controlled reminders and follow-up management for existing outreach records.

This is a local scheduler, not an uncontrolled automatic messaging system.

## 14.1 Follow-up model

Inspect and reuse the existing FollowUp model.

Store information such as:

- Related outreach
- Related contact and job when applicable
- Due date/time
- Status
- Attempt number
- Notes
- Completion timestamp
- Created and updated timestamps

Use the user's local timezone consistently and document how timestamps are stored.

## 14.2 Follow-up rules

Allow the user to configure a suggested follow-up date.

Support reminders for:

- No response after a chosen interval
- A scheduled follow-up
- A manually created follow-up
- A follow-up that is completed, cancelled or postponed

Do not assume every recipient should receive another message.

## 14.3 Reply handling

Do not claim to detect email replies unless reply retrieval has actually been implemented and authorized.

For the initial implementation, support:

- Manual response recording
- Manual marking of a conversation as replied
- Cancelling or closing pending follow-ups after a response

If authorized Gmail read access is implemented later, treat it as an optional feature requiring explicit consent and additional scopes.

## 14.4 Scheduling

Use a lightweight local Node scheduler compatible with the existing project.

Requirements:

- No cloud scheduler
- No duplicate scheduled tasks after restart
- Persist reminders in SQLite
- Reconcile overdue reminders on startup
- Avoid sending emails from the scheduler without explicit approval
- Handle application shutdown cleanly

The default action should be a reminder or a draft suggestion, not automatic sending.

## 14.5 API and UI

Implement appropriate endpoints:

- `GET /api/follow-ups`
- `POST /api/follow-ups`
- `PUT /api/follow-ups/:id`
- `POST /api/follow-ups/:id/complete`
- `POST /api/follow-ups/:id/cancel`

Add a Follow-ups view with due, upcoming, overdue and completed filters.

## 14.6 Tests

Test:

- Date calculations
- Timezone handling
- Restart/reconciliation behavior
- Duplicate scheduling prevention
- Completed/cancelled follow-ups
- Reply closes relevant reminders
- No unauthorized sending
- Persistence and overdue handling

## Deliverable

A dependable local follow-up manager.

Create `docs/follow-up-engine.md`.

---

# MODULE 15 — COMPLETE APPLICATION TRACKING

## Objective

Make the application lifecycle consistent across jobs, applications, outreach and interviews.

Do not create a second application system if Module 9 already has the required model.

## 15.1 Inspect existing schema

Inspect Application and existing job CRM status fields.

Choose one authoritative application record per user/job according to the existing schema.

Preserve the existing unique user/job constraint if present.

If the current CRM has job statuses but no reliable Application record, connect these cleanly rather than duplicating statuses in unrelated tables.

## 15.2 Lifecycle

Support a documented lifecycle such as:

- interested
- preparing
- applied
- assessment
- interview
- offer
- rejected
- withdrawn
- archived

Use the project's established status conventions if they already exist.

Define valid transitions where appropriate.

## 15.3 Application information

Track relevant information:

- Related job
- Application status
- Application date
- Last updated date
- Source
- Resume/reference used, if supported
- Relevant notes
- Next action
- Interview dates and notes
- Offer details entered by the user
- Rejection/withdrawal notes

Do not collect sensitive information that is not necessary.

## 15.4 Activity history

Implement a lightweight application activity timeline if the existing models can support it cleanly.

Record meaningful events such as:

- Application created
- Status changed
- Interview scheduled
- Interview completed
- Offer recorded
- Application withdrawn

Do not fabricate historical events for existing records.

## 15.5 API

Support endpoints consistent with the current backend:

- `GET /api/applications`
- `GET /api/applications/:id`
- `POST /api/applications`
- `PUT /api/applications/:id`
- `POST /api/applications/:id/status`
- Appropriate activity-history endpoints if required

Validate job references and prevent duplicate applications for the same user/job.

## 15.6 UI

Provide:

- Application list
- Status filters
- Application detail panel
- Status-change controls
- Notes and next actions
- Interview dates
- Timeline
- Links to the original job and related contacts

## 15.7 Tests

Test lifecycle transitions, duplicate prevention, date validation, persistence, activity history and consistency with existing CRM statuses.

## Deliverable

A complete and consistent application-tracking workflow.

Create `docs/application-tracking.md`.

---

# MODULE 16 — UNIFIED DASHBOARD

## Objective

Turn the existing ORION interface into a useful unified dashboard.

Do not replace the whole frontend with a new design or framework.

## 16.1 Dashboard summary

Display real data from existing APIs:

- Total discovered jobs
- Eligible jobs
- Strong/excellent matches
- Saved jobs
- Applications by status
- Upcoming interviews
- Pending outreach approvals
- Sent outreach messages
- Upcoming and overdue follow-ups
- Contacts

Do not display hard-coded counts or fake statistics.

## 16.2 Quick actions

Provide links/actions for:

- Discover jobs
- Run the normalization/filtering/matching pipeline
- View high-scoring jobs
- View saved jobs
- Add a contact
- Generate an outreach draft
- Review approval queue
- View applications
- View upcoming follow-ups

All actions must call real APIs and report their outcomes.

## 16.3 UX

Include:

- Loading states
- Empty states
- Recoverable error states
- Clear navigation
- Responsive layout
- Accessible labels and keyboard interaction
- Confirmation for destructive actions

Avoid unnecessary animation or large dependency additions.

## 16.4 API

Reuse existing endpoints. Add a dashboard summary endpoint only if it materially improves performance or consistency.

Use database aggregation where practical instead of downloading every record to calculate simple totals.

## 16.5 Tests

Test dashboard aggregation, empty database behavior, API errors and consistency between summary counts and underlying records.

## Deliverable

A data-driven dashboard that reflects actual local records.

Create or update `docs/dashboard.md`.

---

# MODULE 17 — ANALYTICS

## Objective

Provide transparent job-search and outreach analytics from actual local data.

## 17.1 Metrics

Support metrics such as:

- Jobs discovered over time
- Jobs shortlisted
- Applications submitted
- Applications by status
- Interviews received
- Offers received
- Outreach drafts created
- Messages approved and sent
- Responses manually recorded or verified through an authorized integration
- Follow-ups completed
- Application conversion rates
- Outreach response rates, where the denominator is meaningful

Define every metric clearly.

For example, do not calculate a response rate using draft messages as though they were sent.

Do not interpret missing reply data as zero replies if reply tracking has not been enabled.

## 17.2 Time ranges

Support sensible ranges such as:

- Last 7 days
- Last 30 days
- Last 90 days
- All time
- Custom date range, if practical

Use a consistent timezone and date-boundary convention.

## 17.3 Visualization

Use the existing frontend charting solution if one exists.

Otherwise, choose a small, maintained dependency only if needed.

Provide accessible labels and a tabular or textual alternative to charts.

Do not add decorative charts without useful information.

## 17.4 API

Implement endpoints such as:

- `GET /api/analytics/overview`
- `GET /api/analytics/applications`
- `GET /api/analytics/outreach`
- `GET /api/analytics/jobs`

Use date filters and aggregation queries.

## 17.5 Tests

Test formulas, date ranges, zero-denominator behavior, empty datasets, time boundaries and consistency with stored records.

## Deliverable

A useful analytics section based only on real data.

Create `docs/analytics.md`.

---

# MODULE 18 — BACKUP AND RESTORE

## Objective

Protect the local SQLite database and uploaded resume files.

This is a high-risk module. Implement and test it conservatively.

## 18.1 Backup scope

Back up:

- SQLite database
- Required local uploaded files
- Relevant metadata needed for restoration

Do not include:

- `node_modules`
- Frontend build output unless explicitly required
- Temporary files
- Logs containing secrets
- OAuth tokens unless a separately designed secure backup mechanism is explicitly approved

## 18.2 Consistent backup

Use a SQLite-supported consistent backup mechanism.

Do not simply copy a live database file if doing so could produce an inconsistent backup.

If necessary, briefly coordinate writes or use the database's supported backup facilities.

Store backups in a user-configurable local directory outside the source-controlled project directory by default.

Use timestamped filenames.

## 18.3 Backup metadata

Include a manifest containing:

- Backup creation timestamp
- Application/schema version
- Database file name
- Included file inventory
- Backup format version
- Checksums where practical

Do not include private profile information in the manifest unless necessary.

## 18.4 Restore safeguards

Restore must:

1. Validate the selected backup.
2. Verify the manifest and checksums where available.
3. Verify the database file can be opened.
4. Validate that referenced files exist or report missing files.
5. Create a backup of the current state before replacement.
6. Stop or coordinate database writes during restore.
7. Replace data safely.
8. Reconnect Prisma/database clients correctly.
9. Verify database integrity and schema compatibility.
10. Report success or failure clearly.

Never silently overwrite the only copy of user data.

Reject malformed paths and prevent path traversal.

Do not restore arbitrary files to arbitrary locations.

## 18.5 UI

Provide:

- Create backup
- Backup destination
- List available backups
- Backup details
- Restore preview
- Restore confirmation
- Restore progress/result
- Clear error messages

Require explicit confirmation before restoring.

## 18.6 Tests

Test backup creation, manifest validation, corrupted backups, interrupted operations where practical, missing files, safe restore, pre-restore backup, path traversal and database integrity.

Use temporary test directories and disposable test databases. Never run destructive tests against the user's real database.

## Deliverable

Reliable local backup and restore.

Create `docs/backup-restore.md`.

---

# MODULE 19 — SECURITY AND PRIVACY HARDENING

## Objective

Review the full local application for realistic security and privacy risks before packaging it.

This is a security-hardening module, not a reason to rewrite the architecture.

## 19.1 API validation

Audit all endpoints for:

- Input validation
- Safe database access
- Proper error responses
- Oversized request protection
- Invalid identifiers
- Path traversal
- Unsafe file handling
- Unsafe URL handling
- Unexpected content types
- Excessive query sizes
- Accidental exposure of stack traces or secrets

Use existing validation libraries where appropriate; avoid unnecessary dependencies.

## 19.2 Local API access

Determine how the server binds and how the frontend reaches it.

If the application is intended for a single local user:

- Bind to loopback by default.
- Do not expose the API to the local network unless explicitly configured.
- Restrict sensitive operations appropriately.
- Apply appropriate CORS protections.
- Protect state-changing requests against applicable cross-origin risks.
- Do not assume that a locally running API is automatically inaccessible to malicious websites.

Document the local threat model.

## 19.3 File upload security

Audit resume uploads:

- Type and size checks
- Server-generated filenames
- No arbitrary filesystem paths
- Safe storage directory
- Safe download/view behavior
- No public exposure of uploaded files
- Appropriate error handling

## 19.4 Secrets and OAuth

Ensure:

- No secrets committed to Git
- Environment files ignored where appropriate
- OAuth tokens stored using a secure local mechanism
- Tokens excluded from ordinary logs
- Disconnect revokes or clears local credentials appropriately
- Sensitive configuration is not returned by status APIs

## 19.5 Logging and privacy

Avoid logging resumes, full contact records, access tokens or complete sensitive message bodies unnecessarily.

Provide understandable local data and integration controls.

Do not claim that data is encrypted at rest unless actual encryption is implemented and verified.

Document what remains unencrypted and any relevant OS-level protections.

## 19.6 Dependencies

Audit dependencies and scripts.

- Remove unnecessary dependencies.
- Check for known vulnerabilities using the available package tooling.
- Avoid blindly applying breaking major-version upgrades.
- Fix relevant vulnerabilities where feasible.
- Report anything unresolved.

## 19.7 Data deletion

Provide safe deletion behavior for user-created contacts, drafts, notes and other appropriate records.

Respect foreign-key relationships and explain what is retained or removed.

Do not silently delete application history or files that other records still reference.

## 19.8 Tests

Add regression tests for security-sensitive behavior, including path traversal, invalid input, unauthorized network binding where testable, secret redaction and file access restrictions.

## Deliverable

A documented security review, implemented fixes and a list of remaining risks.

Create `docs/security-privacy.md`.

---

# MODULE 20 — WINDOWS DESKTOP PACKAGING

## Objective

Package ORION as a usable Windows desktop application while preserving the local-first architecture.

## 20.1 Inspect packaging options

Inspect the current application structure and evaluate a suitable packaging solution such as Electron or Tauri.

Choose one based on compatibility with the existing React/Vite frontend and Express backend.

Do not introduce both.

Do not begin packaging until Modules 11–19 are implemented and their tests pass, except for preparatory investigation.

## 20.2 Desktop behavior

The packaged application should:

- Open a desktop window
- Start the local backend safely
- Use the existing SQLite database
- Store persistent user data in an appropriate per-user application-data directory
- Store uploaded files and backups in appropriate local locations
- Stop background processes cleanly on exit
- Handle startup failures clearly
- Avoid launching duplicate backend instances
- Keep logs in a suitable local location
- Provide a documented development mode

Do not store the production database inside a directory that may be replaced during an application update.

Do not assume the development path `D:\ORION` will exist on another computer.

## 20.3 Security

- Keep the desktop application isolated from unnecessary operating-system capabilities.
- Use secure window settings and restrictive permissions.
- Do not expose broad Node.js access to untrusted renderer content.
- Validate IPC messages if Electron is selected.
- Keep external navigation controlled.
- Do not expose secrets in frontend bundles.
- Keep local data separate from application binaries.

## 20.4 Packaging and installation

Provide:

- Development startup instructions
- Production build instructions
- Windows package or installer configuration
- Version information
- App icon configuration if assets are available
- Clear first-run behavior
- Upgrade and data-preservation notes
- Uninstall behavior that does not silently erase user data

Do not claim an installer works unless it has been built and tested.

## 20.5 Tests

Verify frontend build, backend startup, packaged-app configuration, persistent data paths, clean shutdown and that existing local data is not overwritten by an application update.

If full GUI testing is unavailable, state the limitation explicitly.

## Deliverable

A reproducible Windows packaging workflow and documented installation instructions.

Create `docs/desktop-packaging.md`.

---

# MODULE 21 — GITHUB RELEASE

## Objective

Prepare a clean, documented and reproducible public release of ORION.

Do not publish, push, create a release, or expose private information without explicit authorization.

## 21.1 Repository hygiene

Inspect Git status and repository history.

Ensure the repository does not contain:

- `.env` files with secrets
- OAuth credentials
- SQLite database files
- Real user profiles
- Uploaded resumes
- Personal contact data
- Local backups
- Logs containing sensitive data
- Build artifacts that should not be tracked

Review `.gitignore`.

Do not delete existing user work or rewrite history without explicit authorization.

If a secret has already been committed, report the exposure and recommend revocation/rotation. Removing the current file alone may not remove it from Git history.

## 21.2 Documentation

Update the main README with:

- What ORION does
- Features
- Architecture diagram
- Technology stack
- Local-first/privacy approach
- Prerequisites
- Supported Node.js version
- Installation
- Development startup
- Database initialization
- Ollama setup, optional
- Gmail OAuth setup, optional
- Windows packaging
- Backup and restore
- Tests
- Known limitations
- Troubleshooting
- License status

Do not claim a license has been chosen if it has not. Ask before adding a license that changes reuse rights.

## 21.3 Setup experience

Make a new local installation reproducible:

1. Clone repository.
2. Install dependencies.
3. Configure supported environment variables.
4. Initialize the local database through documented migrations.
5. Generate Prisma Client.
6. Start the application.
7. Complete candidate onboarding.
8. Configure preferences.
9. Optionally connect Ollama and Gmail.
10. Create a backup.

Do not seed real or fake candidate data by default.

## 21.4 Automated checks

Provide or improve a release-check script that verifies:

- Required runtime version
- Dependency installation state
- Prisma validation
- Prisma Client generation
- Migration status
- Backend test suite
- Frontend production build
- Secret and local-data exclusion checks where practical

Do not run destructive database commands in release checks.

## 21.5 Release preparation

Prepare:

- Version number
- Changelog
- Release notes
- Installation instructions
- Known issues
- Build artifacts if successfully generated

Do not push to GitHub or publish a release unless explicitly authorized.

## 21.6 Final tests

Test a clean setup using a disposable database and temporary local-data directory. Confirm the documented steps are accurate.

## Deliverable

A release-ready repository and reproducible release checklist.

Create or update:

- `README.md`
- `CHANGELOG.md`
- `docs/installation.md`
- `docs/release-checklist.md`

---

# 4. DATABASE AND MIGRATION SAFETY — MANDATORY FOR ALL MODULES

The database contains local user data. Treat it as valuable.

Before changing the Prisma schema:

1. Inspect the current schema.
2. Inspect existing migrations.
3. Confirm current migration status.
4. Create a timestamped backup of the current SQLite database using a consistent backup mechanism.
5. Record the backup path.
6. Make additive schema changes where practical.
7. Create a new migration with a descriptive name.
8. Generate Prisma Client.
9. Verify migration status and database integrity.

Never:

- Run `prisma migrate reset`.
- Delete or recreate the existing database.
- Modify the original `0_init` migration.
- Rewrite completed historical migrations.
- Delete `_prisma_migrations`.
- Manually rewrite migration history to hide a failure.
- Seed fake candidate/profile/preference records in the real database.
- Use destructive test fixtures against the user's real database.

If a migration fails, stop and diagnose the cause. Preserve the database and report the exact failure.

Use the project's existing Prisma version and migration conventions.

## Node.js runtime

Use the working Node.js 22 runtime:

`C:\Tools\node-v22\node-v22.19.0-win-x64`

Expected versions:

- Node.js 22.19.0
- npm 10.9.3
- Prisma 6.19.3

If a new PowerShell session defaults to another Node version, prepend the working runtime path:

`$env:Path = 'C:\Tools\node-v22\node-v22.19.0-win-x64;' + $env:Path`

Verify `node -v` and `npm -v` before Prisma operations.

---

# 5. TESTING STRATEGY

Each module must have meaningful automated tests.

Use:

- Unit tests for business logic
- API integration tests
- Mocked Gmail/Ollama integrations
- Temporary SQLite databases for database integration tests
- Frontend tests if a suitable test framework already exists
- Manual checks where automation is impractical

Do not count test files as proof of correctness. Inspect test coverage for meaningful assertions.

Important end-to-end scenarios:

### Scenario A — Generate and approve outreach

1. Select a real stored job.
2. Select a real stored contact.
3. Generate an outreach draft.
4. Edit the message.
5. Submit for approval.
6. Approve the exact final content.
7. Verify the message cannot be sent if edited afterward without reapproval.

### Scenario B — Email sending

1. Verify the Gmail integration is disconnected by default.
2. Verify an unapproved message cannot be sent.
3. Verify an approved message can be sent only after explicit user action and valid OAuth setup.
4. Verify duplicate sends are prevented.
5. Verify errors do not expose credentials.

Do not send a real email during automated testing.

### Scenario C — Follow-up

1. Create an outreach record.
2. Schedule a follow-up.
3. Verify persistence after restart.
4. Mark the contact as having replied.
5. Verify the relevant follow-up is cancelled or closed appropriately.

### Scenario D — Application tracking

1. Select a stored job.
2. Create an application.
3. Change the application status.
4. Record an interview.
5. Verify the activity timeline and dashboard counts.

### Scenario E — Backup and restore

1. Use a disposable database.
2. Create a backup.
3. Modify disposable records.
4. Restore the backup.
5. Verify database integrity and file references.
6. Verify that a pre-restore backup exists.

### Scenario F — Desktop and release

1. Build the frontend.
2. Start the backend.
3. Verify persistent local data paths.
4. Verify a new local setup follows the documentation.
5. Verify local databases, resumes, backups and secrets are excluded from Git.

Do not fabricate test data in the actual user database. Use disposable fixtures and mocks.

---

# 6. INTEGRATION REQUIREMENTS

All modules must work together rather than existing as isolated pages.

The expected final user journey is:

1. User discovers jobs.
2. ORION normalizes and deduplicates them.
3. ORION filters and scores jobs against preferences.
4. User reviews matches and manages opportunities.
5. User manages recruiter and employee contacts.
6. User generates a personalized outreach draft.
7. User edits and submits the draft for approval.
8. User approves the exact message.
9. User explicitly sends it through the configured email integration or copies it for manual LinkedIn use.
10. ORION records the result.
11. User schedules follow-ups.
12. User records replies and progresses applications.
13. Dashboard and analytics reflect real records.
14. User can back up and restore local data.
15. Security controls protect local files and credentials.
16. The application can be packaged and installed on Windows.
17. The repository can be set up and tested reproducibly.

Avoid circular dependencies between services.

Avoid duplicate sources of truth for application and outreach statuses.

Use database transactions when several related records must be changed atomically.

Use idempotent operations where repeated calls could otherwise create duplicate applications, follow-ups or emails.

---

# 7. EXECUTION ORDER

Implement the work in this order:

Phase 1:
- Module 11 — AI Message Generation
- Module 12 — Outreach Approval

Phase 2:
- Module 13 — Gmail Integration
- Module 14 — Follow-up Engine
- Module 15 — Application Tracking

Phase 3:
- Module 16 — Dashboard
- Module 17 — Analytics

Phase 4:
- Module 18 — Backup and Restore
- Module 19 — Security and Privacy Hardening

Phase 5:
- Module 20 — Windows Desktop Packaging
- Module 21 — GitHub Release Preparation

At the beginning of each phase:

1. Review dependencies and relevant existing code.
2. Implement the next module in order.
3. Add tests and documentation.
4. Run the relevant tests.
5. Check regression behavior.
6. Continue to the next module when safe.

**Do not stop after the initial audit. Start implementing Module 11 immediately and continue sequentially through Module 21 in this development task.**

If the session, tool limits, or available time prevent finishing everything, leave the repository in a working state and provide an exact continuation prompt that starts from the first incomplete requirement. Do not repeat completed work.

Do not claim all modules are complete just because their files or UI pages exist.

---

# 8. FINAL VERIFICATION

At the end, run the relevant available checks, including:

- Prisma validation
- Prisma Client generation
- Migration status
- Backend automated tests
- Frontend production build
- Database health check
- Existing Module 0–10 regression tests
- New Modules 11–21 tests
- Security-sensitive integration tests
- Packaging checks, if implemented

Report the exact commands and actual results.

For email and Ollama integrations, distinguish between mocked tests and live integration tests. Never claim live Gmail sending was verified if no authorized test was performed.

For backup and restore, use a disposable database in destructive tests.

For packaging, report whether the installer was actually built and tested or only configured.

---

# 9. FINAL AUDIT REPORT

Produce a report with this title:

ORION MODULES 11–21 — FINAL IMPLEMENTATION AUDIT

For each module, use:

| Module | Requirement | Status | Evidence |
|---|---|---|---|
| 11 | AI message generation | | |
| 12 | Outreach approval | | |
| 13 | Gmail integration | | |
| 14 | Follow-up engine | | |
| 15 | Application tracking | | |
| 16 | Unified dashboard | | |
| 17 | Analytics | | |
| 18 | Backup and restore | | |
| 19 | Security and privacy | | |
| 20 | Windows desktop packaging | | |
| 21 | GitHub release preparation | | |

Use only these status values:

- Complete
- Partial
- Missing
- Broken

Then include:

1. Initial repository audit and baseline results
2. Features implemented
3. Files created
4. Files modified
5. Database changes and migration names
6. Backup paths
7. API endpoints added or modified
8. Frontend changes
9. Message-generation behavior
10. Approval-state transitions and integrity checks
11. Gmail OAuth and credential-storage approach
12. Email-send safeguards and duplicate prevention
13. Follow-up scheduling and reply handling
14. Application lifecycle and activity tracking
15. Dashboard metrics
16. Analytics definitions and formulas
17. Backup and restore verification
18. Security review findings
19. Remaining security risks
20. Tests executed and exact counts
21. Prisma migration status
22. Frontend build results
23. Module 0–10 regression results
24. Desktop packaging status
25. Release readiness
26. Known limitations
27. Exact remaining work, if any
28. The next action required from the user

Do not expose OAuth tokens, secrets, resume content, contact data or other private values in the report.

If any module is incomplete, state why and list the exact remaining requirements.

The final status must be one of:

ORION MODULES 11–21 — COMPLETE

ORION MODULES 11–21 — PARTIALLY COMPLETE

Use COMPLETE only when the required functionality has actually been implemented and verified. A configured integration, empty UI page, or mocked test alone is not sufficient evidence of full completion.

---

# FINAL INSTRUCTION

Start directly with Module 11.

Preserve all existing work from Modules 0–10.

Implement Modules 11–21 sequentially, with tests and documentation.

Do not rebuild the project.

Do not reset the database.

Do not invent data.

Do not send email without explicit user approval.

Do not publish to GitHub without explicit authorization.

Finish as much as can be safely implemented, verify the real result, and clearly report what remains."�E"css(:
B b%file:///d:/ORION/client/src/index.cssjfile:///d:/ORION2C"css(:
b%file:///d:/ORION/client/src/index.cssjfile:///d:/ORIONb�
}jbB0�X��O>
execute_url(localhost)$mcp(chrome_devtools/evaluate_script)read_url(*)z���*
  p:j�
}jbB0�X��O>
execute_url(localhost)$mcp(chrome_devtools/evaluate_script)read_url(*)z�
��*
  p: