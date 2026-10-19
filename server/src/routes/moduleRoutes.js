/**
 * Module 11-18 API routes.
 * Outreach generation, approval, follow-ups, applications, dashboard, analytics, backup.
 */
import { prisma } from '../lib/prisma.js'
import { generateOutreachMessage, MESSAGE_TYPES, TONES, LENGTHS, CHANNELS } from '../services/outreach/messageGenerator.js'
import { OUTREACH_STATES, isValidTransition, computeContentHash, isApprovalValid, getValidNextStates } from '../services/outreach/outreachStateMachine.js'
import { gmailService } from '../services/email/gmailService.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.resolve(currentDirectory, '../../../data')
const defaultBackupDir = path.resolve(dataDirectory, 'backups')

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const outreachInclude = { job: { include: { company: true } }, contact: { include: { company: true } } }

export function registerModuleRoutes(app) {

  // ══════════════════════════════════════════
  // MODULE 11: Outreach Message Generation
  // ══════════════════════════════════════════

  app.post('/api/outreach/generate', async (request, response) => {
    try {
      const user = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
        include: { candidateProfile: { include: { skills: true } } },
      })
      if (!user?.candidateProfile) {
        return response.status(409).json({ success: false, message: 'Create a candidate profile first.' })
      }

      const { messageType, jobId, contactId, tone, lengthPreference, channel, userContext } = request.body ?? {}

      if (!messageType || !MESSAGE_TYPES.has(messageType)) {
        return response.status(400).json({
          success: false,
          message: `Invalid messageType. Must be one of: ${[...MESSAGE_TYPES].join(', ')}`,
        })
      }
      if (tone && !TONES.has(tone)) {
        return response.status(400).json({
          success: false,
          message: `Invalid tone. Must be one of: ${[...TONES].join(', ')}`,
        })
      }
      if (lengthPreference && !LENGTHS.has(lengthPreference)) {
        return response.status(400).json({
          success: false,
          message: `Invalid length. Must be one of: ${[...LENGTHS].join(', ')}`,
        })
      }

      const job = jobId
        ? await prisma.job.findUnique({ where: { id: jobId }, include: { company: true, skills: true } })
        : null
      const contact = contactId
        ? await prisma.contact.findUnique({ where: { id: contactId }, include: { company: true } })
        : null

      if (jobId && !job) return response.status(404).json({ success: false, message: 'Job not found.' })
      if (contactId && !contact) return response.status(404).json({ success: false, message: 'Contact not found.' })

      const candidate = user.candidateProfile
      const result = await generateOutreachMessage({
        messageType,
        candidate,
        job,
        contact,
        tone: tone || 'professional',
        lengthPreference: lengthPreference || 'medium',
        channel: channel || 'email',
        userContext: typeof userContext === 'string' ? userContext.slice(0, 1000) : '',
      })

      const outreach = await prisma.outreach.create({
        data: {
          userId: user.id,
          jobId: job?.id || null,
          contactId: contact?.id || null,
          channel: channel || 'email',
          messageType,
          subject: result.subject,
          message: result.message,
          tone: tone || 'professional',
          lengthPreference: lengthPreference || 'medium',
          generationSource: result.generationSource,
          status: 'draft',
          userContext: typeof userContext === 'string' ? userContext.slice(0, 1000) : null,
        },
        include: outreachInclude,
      })

      response.status(201).json({ success: true, outreach, generationSource: result.generationSource })
    } catch (error) {
      console.error('Outreach generation failed:', error)
      response.status(500).json({ success: false, message: 'Could not generate outreach message.' })
    }
  })

  app.get('/api/outreach', async (request, response) => {
    try {
      const statusFilter = text(request.query.status)
      const typeFilter = text(request.query.messageType)
      const where = {}
      if (statusFilter) where.status = statusFilter
      if (typeFilter) where.messageType = typeFilter

      const outreachList = await prisma.outreach.findMany({
        where,
        include: outreachInclude,
        orderBy: { createdAt: 'desc' },
      })
      response.json({ success: true, outreach: outreachList })
    } catch (error) {
      console.error('Outreach listing failed:', error)
      response.status(500).json({ success: false, message: 'Could not load outreach messages.' })
    }
  })

  app.get('/api/outreach/approval-queue', async (_request, response) => {
    try {
      const queue = await prisma.outreach.findMany({
        where: { status: { in: ['pending_approval', 'approved', 'rejected'] } },
        include: outreachInclude,
        orderBy: { updatedAt: 'desc' },
      })
      response.json({ success: true, queue })
    } catch (error) {
      console.error('Approval queue failed:', error)
      response.status(500).json({ success: false, message: 'Could not load approval queue.' })
    }
  })

  app.get('/api/outreach/:id', async (request, response) => {
    try {
      const outreach = await prisma.outreach.findUnique({
        where: { id: request.params.id },
        include: outreachInclude,
      })
      if (!outreach) return response.status(404).json({ success: false, message: 'Outreach not found.' })
      response.json({ success: true, outreach })
    } catch (error) {
      console.error('Outreach lookup failed:', error)
      response.status(500).json({ success: false, message: 'Could not load outreach message.' })
    }
  })

  app.put('/api/outreach/:id', async (request, response) => {
    try {
      const existing = await prisma.outreach.findUnique({ where: { id: request.params.id } })
      if (!existing) return response.status(404).json({ success: false, message: 'Outreach not found.' })

      const { subject, message } = request.body ?? {}
      if (message !== undefined && (typeof message !== 'string' || !message.trim())) {
        return response.status(400).json({ success: false, message: 'Message body cannot be empty.' })
      }

      const updateData = {}
      if (subject !== undefined) updateData.subject = subject
      if (message !== undefined) updateData.message = message.trim()

      // If an approved message is edited, invalidate approval
      const contentChanged =
        (subject !== undefined && subject !== existing.subject) ||
        (message !== undefined && message.trim() !== existing.message)

      if (contentChanged && existing.status === 'approved') {
        updateData.status = 'draft'
        updateData.approvedAt = null
        updateData.approvedContentHash = null
      }

      const outreach = await prisma.outreach.update({
        where: { id: request.params.id },
        data: updateData,
        include: outreachInclude,
      })
      response.json({ success: true, outreach })
    } catch (error) {
      console.error('Outreach update failed:', error)
      response.status(500).json({ success: false, message: 'Could not update outreach message.' })
    }
  })

  app.delete('/api/outreach/:id', async (request, response) => {
    try {
      const existing = await prisma.outreach.findUnique({ where: { id: request.params.id } })
      if (!existing) return response.status(404).json({ success: false, message: 'Outreach not found.' })
      if (existing.status === 'sending' || existing.status === 'sent') {
        return response.status(409).json({ success: false, message: 'Cannot delete a message that is being sent or has been sent.' })
      }

      await prisma.outreach.delete({ where: { id: request.params.id } })
      response.json({ success: true, message: 'Outreach deleted.' })
    } catch (error) {
      console.error('Outreach deletion failed:', error)
      response.status(500).json({ success: false, message: 'Could not delete outreach message.' })
    }
  })

  // ══════════════════════════════════════════
  // MODULE 12: Outreach Approval System
  // ══════════════════════════════════════════

  app.post('/api/outreach/:id/submit', async (request, response) => {
    try {
      const outreach = await prisma.outreach.findUnique({ where: { id: request.params.id } })
      if (!outreach) return response.status(404).json({ success: false, message: 'Outreach not found.' })

      if (!isValidTransition(outreach.status, 'pending_approval')) {
        return response.status(409).json({
          success: false,
          message: `Cannot submit from status '${outreach.status}'. Valid: ${getValidNextStates(outreach.status).join(', ')}`,
        })
      }

      const updated = await prisma.outreach.update({
        where: { id: request.params.id },
        data: { status: 'pending_approval' },
        include: outreachInclude,
      })
      response.json({ success: true, outreach: updated })
    } catch (error) {
      console.error('Submit failed:', error)
      response.status(500).json({ success: false, message: 'Could not submit for approval.' })
    }
  })

  app.post('/api/outreach/:id/approve', async (request, response) => {
    try {
      const outreach = await prisma.outreach.findUnique({ where: { id: request.params.id } })
      if (!outreach) return response.status(404).json({ success: false, message: 'Outreach not found.' })

      if (!isValidTransition(outreach.status, 'approved')) {
        return response.status(409).json({
          success: false,
          message: `Cannot approve from status '${outreach.status}'.`,
        })
      }

      const contentHash = computeContentHash(outreach.subject, outreach.message)
      const updated = await prisma.outreach.update({
        where: { id: request.params.id },
        data: { status: 'approved', approvedAt: new Date(), approvedContentHash: contentHash },
        include: outreachInclude,
      })
      response.json({ success: true, outreach: updated })
    } catch (error) {
      console.error('Approval failed:', error)
      response.status(500).json({ success: false, message: 'Could not approve outreach.' })
    }
  })

  app.post('/api/outreach/:id/reject', async (request, response) => {
    try {
      const outreach = await prisma.outreach.findUnique({ where: { id: request.params.id } })
      if (!outreach) return response.status(404).json({ success: false, message: 'Outreach not found.' })

      if (!isValidTransition(outreach.status, 'rejected')) {
        return response.status(409).json({
          success: false,
          message: `Cannot reject from status '${outreach.status}'.`,
        })
      }

      const updated = await prisma.outreach.update({
        where: { id: request.params.id },
        data: { status: 'rejected' },
        include: outreachInclude,
      })
      response.json({ success: true, outreach: updated })
    } catch (error) {
      console.error('Rejection failed:', error)
      response.status(500).json({ success: false, message: 'Could not reject outreach.' })
    }
  })

  app.post('/api/outreach/:id/cancel', async (request, response) => {
    try {
      const outreach = await prisma.outreach.findUnique({ where: { id: request.params.id } })
      if (!outreach) return response.status(404).json({ success: false, message: 'Outreach not found.' })

      if (!isValidTransition(outreach.status, 'cancelled')) {
        return response.status(409).json({
          success: false,
          message: `Cannot cancel from status '${outreach.status}'.`,
        })
      }

      const updated = await prisma.outreach.update({
        where: { id: request.params.id },
        data: { status: 'cancelled' },
        include: outreachInclude,
      })
      response.json({ success: true, outreach: updated })
    } catch (error) {
      console.error('Cancel failed:', error)
      response.status(500).json({ success: false, message: 'Could not cancel outreach.' })
    }
  })

  // ══════════════════════════════════════════
  // MODULE 13: Email Integration & Sending Safeguards
  // ══════════════════════════════════════════

  app.get('/api/email/status', async (_request, response) => {
    try {
      const status = await gmailService.getConnectionStatus()
      response.json({ success: true, ...status })
    } catch (error) {
      console.error('Email status error:', error)
      response.status(500).json({ success: false, message: 'Could not fetch email status.' })
    }
  })

  app.get('/api/email/auth-url', async (_request, response) => {
    try {
      const result = gmailService.generateAuthUrl()
      response.json({ success: true, ...result })
    } catch (error) {
      response.status(400).json({ success: false, message: error.message })
    }
  })

  app.post('/api/email/callback', async (request, response) => {
    try {
      const { code, state } = request.body ?? {}
      if (!code || !state) {
        return response.status(400).json({ success: false, message: 'OAuth code and state are required.' })
      }
      const tokens = await gmailService.exchangeCodeForTokens(code, state)
      response.json({
        success: true,
        message: 'Gmail successfully connected.',
        email: tokens.userEmail || 'connected-user@gmail.com',
      })
    } catch (error) {
      response.status(400).json({ success: false, message: error.message })
    }
  })

  app.post('/api/email/disconnect', async (_request, response) => {
    try {
      await gmailService.disconnect()
      response.json({ success: true, message: 'Gmail disconnected.' })
    } catch (error) {
      console.error('Disconnect failed:', error)
      response.status(500).json({ success: false, message: 'Could not disconnect Gmail.' })
    }
  })

  app.post('/api/email/send-test', async (request, response) => {
    try {
      const { confirm, recipientEmail } = request.body ?? {}
      if (!confirm) {
        return response.status(400).json({
          success: false,
          message: 'Explicit user confirmation is required to send a test email.',
        })
      }
      if (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
        return response.status(400).json({
          success: false,
          message: 'Valid recipient email address is required.',
        })
      }

      const result = await gmailService.sendEmail({
        to: recipientEmail,
        subject: '[ORION Test] Gmail Integration Verification',
        body: 'Hello,\n\nThis is a test email sent from your local ORION instance to confirm your Gmail connection is functioning properly.',
      })
      response.json({ success: true, message: 'Test email sent.', messageId: result.messageId })
    } catch (error) {
      response.status(502).json({ success: false, message: error.message })
    }
  })

  app.post('/api/outreach/:id/send', async (request, response) => {
    try {
      const outreach = await prisma.outreach.findUnique({
        where: { id: request.params.id },
        include: outreachInclude,
      })
      if (!outreach) return response.status(404).json({ success: false, message: 'Outreach not found.' })

      // Safeguard 1: Confirm status is approved
      if (outreach.status !== 'approved') {
        return response.status(409).json({ success: false, message: 'Only approved messages can be sent.' })
      }

      // Safeguard 2: Confirm approved content still matches current content
      if (!isApprovalValid(outreach)) {
        return response.status(409).json({
          success: false,
          message: 'Message content has changed since approval. Please resubmit for approval.',
        })
      }

      // LinkedIn channel must be sent manually
      if (outreach.channel === 'linkedin') {
        return response.status(400).json({
          success: false,
          message: 'LinkedIn messages must be sent manually. Use the copy button.',
        })
      }

      if (outreach.channel !== 'email') {
        return response.status(400).json({
          success: false,
          message: `Sending is not supported for channel '${outreach.channel}'.`,
        })
      }

      // Safeguard 3: Confirm valid recipient
      let recipientEmail = text(request.body?.recipientEmail) || outreach.contact?.email
      if (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
        return response.status(400).json({
          success: false,
          message: 'A valid recipient email address is required to send this outreach.',
        })
      }

      // Safeguard 4: Prevent duplicate / concurrent sends by transitioning to 'sending' atomically
      const lockResult = await prisma.outreach.updateMany({
        where: { id: outreach.id, status: 'approved' },
        data: { status: 'sending' },
      })
      if (lockResult.count === 0) {
        return response.status(409).json({
          success: false,
          message: 'Message is already being processed or is not in approved state.',
        })
      }

      try {
        // Safeguard 5: Dispatch through Gmail service
        const sendResult = await gmailService.sendEmail({
          to: recipientEmail,
          subject: outreach.subject || 'Opportunity Outreach',
          body: outreach.message,
        })

        // Safeguard 6: Persist result and transition to 'sent'
        const updated = await prisma.outreach.update({
          where: { id: outreach.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
            providerMessageId: sendResult.messageId || null,
            errorMessage: null,
          },
          include: outreachInclude,
        })

        // Also update contact status if linked
        if (outreach.contactId) {
          await prisma.contact.update({
            where: { id: outreach.contactId },
            data: { status: 'reached_out' },
          }).catch(() => {})
        }

        response.json({
          success: true,
          message: 'Outreach email sent successfully.',
          outreach: updated,
          messageId: sendResult.messageId,
        })
      } catch (sendErr) {
        // Transition to failed state on send error
        await prisma.outreach.update({
          where: { id: outreach.id },
          data: {
            status: 'failed',
            errorMessage: sendErr.message,
          },
        })
        return response.status(502).json({
          success: false,
          message: `Email dispatch failed: ${sendErr.message}`,
        })
      }
    } catch (error) {
      console.error('Send failed:', error)
      response.status(500).json({ success: false, message: 'Could not process send request.' })
    }
  })

  // ══════════════════════════════════════════
  // MODULE 14: Follow-up Management
  // ══════════════════════════════════════════

  const allowedFollowUpStatuses = new Set(['pending', 'completed', 'cancelled', 'postponed'])

  app.get('/api/follow-ups', async (request, response) => {
    try {
      const statusFilter = text(request.query.status)
      const where = {}
      if (statusFilter && allowedFollowUpStatuses.has(statusFilter)) where.status = statusFilter

      const followUps = await prisma.followUp.findMany({
        where,
        include: {
          outreach: { include: { contact: true, job: { include: { company: true } } } },
          contact: true,
          job: { include: { company: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      })
      response.json({ success: true, followUps })
    } catch (error) {
      console.error('Follow-up listing failed:', error)
      response.status(500).json({ success: false, message: 'Could not load follow-ups.' })
    }
  })

  app.post('/api/follow-ups', async (request, response) => {
    try {
      const { outreachId, contactId, jobId, scheduledAt, notes, message } = request.body ?? {}
      if (!scheduledAt) {
        return response.status(400).json({ success: false, message: 'scheduledAt is required.' })
      }

      const parsedDate = new Date(scheduledAt)
      if (isNaN(parsedDate.getTime())) {
        return response.status(400).json({ success: false, message: 'Invalid scheduledAt date.' })
      }

      if (outreachId) {
        const exists = await prisma.outreach.findUnique({ where: { id: outreachId } })
        if (!exists) return response.status(404).json({ success: false, message: 'Outreach not found.' })

        // Prevent duplicate pending follow-ups for same outreach
        const existing = await prisma.followUp.findFirst({
          where: { outreachId, status: 'pending' },
        })
        if (existing) {
          return response.status(409).json({ success: false, message: 'A pending follow-up already exists for this outreach.' })
        }
      }

      const followUp = await prisma.followUp.create({
        data: {
          outreachId: outreachId || null,
          contactId: contactId || null,
          jobId: jobId || null,
          scheduledAt: parsedDate,
          notes: text(notes),
          message: text(message),
          status: 'pending',
        },
        include: { outreach: true, contact: true, job: true },
      })
      response.status(201).json({ success: true, followUp })
    } catch (error) {
      console.error('Follow-up creation failed:', error)
      response.status(500).json({ success: false, message: 'Could not create follow-up.' })
    }
  })

  app.put('/api/follow-ups/:id', async (request, response) => {
    try {
      const existing = await prisma.followUp.findUnique({ where: { id: request.params.id } })
      if (!existing) return response.status(404).json({ success: false, message: 'Follow-up not found.' })

      const { scheduledAt, notes, message, status } = request.body ?? {}
      const updateData = {}

      if (scheduledAt) {
        const parsed = new Date(scheduledAt)
        if (isNaN(parsed.getTime())) return response.status(400).json({ success: false, message: 'Invalid date.' })
        updateData.scheduledAt = parsed
      }
      if (notes !== undefined) updateData.notes = text(notes)
      if (message !== undefined) updateData.message = text(message)
      if (status && allowedFollowUpStatuses.has(status)) updateData.status = status

      const followUp = await prisma.followUp.update({
        where: { id: request.params.id },
        data: updateData,
        include: { outreach: true, contact: true, job: true },
      })
      response.json({ success: true, followUp })
    } catch (error) {
      console.error('Follow-up update failed:', error)
      response.status(500).json({ success: false, message: 'Could not update follow-up.' })
    }
  })

  app.post('/api/follow-ups/:id/complete', async (request, response) => {
    try {
      const existing = await prisma.followUp.findUnique({ where: { id: request.params.id } })
      if (!existing) return response.status(404).json({ success: false, message: 'Follow-up not found.' })
      if (existing.status !== 'pending') {
        return response.status(409).json({ success: false, message: 'Only pending follow-ups can be completed.' })
      }

      const followUp = await prisma.followUp.update({
        where: { id: request.params.id },
        data: { status: 'completed', completedAt: new Date() },
        include: { outreach: true, contact: true, job: true },
      })
      response.json({ success: true, followUp })
    } catch (error) {
      console.error('Follow-up complete failed:', error)
      response.status(500).json({ success: false, message: 'Could not complete follow-up.' })
    }
  })

  app.post('/api/follow-ups/:id/cancel', async (request, response) => {
    try {
      const existing = await prisma.followUp.findUnique({ where: { id: request.params.id } })
      if (!existing) return response.status(404).json({ success: false, message: 'Follow-up not found.' })
      if (existing.status !== 'pending') {
        return response.status(409).json({ success: false, message: 'Only pending follow-ups can be cancelled.' })
      }

      const followUp = await prisma.followUp.update({
        where: { id: request.params.id },
        data: { status: 'cancelled' },
        include: { outreach: true, contact: true, job: true },
      })
      response.json({ success: true, followUp })
    } catch (error) {
      console.error('Follow-up cancel failed:', error)
      response.status(500).json({ success: false, message: 'Could not cancel follow-up.' })
    }
  })

  // ══════════════════════════════════════════
  // MODULE 15: Application Tracking
  // ══════════════════════════════════════════

  const applicationStatuses = [
    'interested', 'preparing', 'applied', 'assessment',
    'interview', 'offer', 'rejected', 'withdrawn', 'archived',
  ]
  const applicationTransitions = {
    interested: ['preparing', 'applied', 'withdrawn', 'archived'],
    preparing: ['applied', 'withdrawn', 'archived'],
    applied: ['assessment', 'interview', 'rejected', 'withdrawn', 'archived'],
    assessment: ['interview', 'rejected', 'withdrawn', 'archived'],
    interview: ['offer', 'rejected', 'withdrawn', 'archived'],
    offer: ['archived', 'withdrawn'],
    rejected: ['archived'],
    withdrawn: ['archived'],
    archived: [],
  }

  app.get('/api/applications', async (request, response) => {
    try {
      const statusFilter = text(request.query.status)
      const where = {}
      if (statusFilter && applicationStatuses.includes(statusFilter)) where.status = statusFilter

      const applications = await prisma.application.findMany({
        where,
        include: {
          job: { include: { company: true } },
          activities: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
        orderBy: { updatedAt: 'desc' },
      })
      response.json({ success: true, applications })
    } catch (error) {
      console.error('Application listing failed:', error)
      response.status(500).json({ success: false, message: 'Could not load applications.' })
    }
  })

  app.get('/api/applications/:id', async (request, response) => {
    try {
      const application = await prisma.application.findUnique({
        where: { id: request.params.id },
        include: {
          job: { include: { company: true } },
          activities: { orderBy: { createdAt: 'desc' } },
        },
      })
      if (!application) return response.status(404).json({ success: false, message: 'Application not found.' })
      response.json({ success: true, application })
    } catch (error) {
      console.error('Application lookup failed:', error)
      response.status(500).json({ success: false, message: 'Could not load application.' })
    }
  })

  app.post('/api/applications', async (request, response) => {
    try {
      const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
      if (!user) return response.status(409).json({ success: false, message: 'Create a candidate profile first.' })

      const { jobId, status, notes, source } = request.body ?? {}
      if (!jobId) return response.status(400).json({ success: false, message: 'jobId is required.' })

      const job = await prisma.job.findUnique({ where: { id: jobId } })
      if (!job) return response.status(404).json({ success: false, message: 'Job not found.' })

      const initialStatus = status && applicationStatuses.includes(status) ? status : 'interested'

      const application = await prisma.$transaction(async (tx) => {
        const app = await tx.application.create({
          data: {
            userId: user.id,
            jobId,
            status: initialStatus,
            notes: text(notes),
            source: text(source),
            appliedAt: initialStatus === 'applied' ? new Date() : null,
          },
          include: { job: { include: { company: true } } },
        })

        await tx.applicationActivity.create({
          data: {
            applicationId: app.id,
            type: 'created',
            description: `Application created with status: ${initialStatus}`,
          },
        })

        return app
      })

      response.status(201).json({ success: true, application })
    } catch (error) {
      if (error.code === 'P2002') {
        return response.status(409).json({ success: false, message: 'An application for this job already exists.' })
      }
      console.error('Application creation failed:', error)
      response.status(500).json({ success: false, message: 'Could not create application.' })
    }
  })

  app.put('/api/applications/:id', async (request, response) => {
    try {
      const existing = await prisma.application.findUnique({ where: { id: request.params.id } })
      if (!existing) return response.status(404).json({ success: false, message: 'Application not found.' })

      const { notes, nextAction, interviewAt, interviewNotes, offerDetails, rejectionNotes } = request.body ?? {}
      const updateData = {}
      if (notes !== undefined) updateData.notes = text(notes)
      if (nextAction !== undefined) updateData.nextAction = text(nextAction)
      if (interviewAt !== undefined) {
        const parsed = interviewAt ? new Date(interviewAt) : null
        if (interviewAt && isNaN(parsed.getTime())) {
          return response.status(400).json({ success: false, message: 'Invalid interviewAt date.' })
        }
        updateData.interviewAt = parsed
      }
      if (interviewNotes !== undefined) updateData.interviewNotes = text(interviewNotes)
      if (offerDetails !== undefined) updateData.offerDetails = text(offerDetails)
      if (rejectionNotes !== undefined) updateData.rejectionNotes = text(rejectionNotes)

      const application = await prisma.application.update({
        where: { id: request.params.id },
        data: updateData,
        include: {
          job: { include: { company: true } },
          activities: { orderBy: { createdAt: 'desc' } },
        },
      })
      response.json({ success: true, application })
    } catch (error) {
      console.error('Application update failed:', error)
      response.status(500).json({ success: false, message: 'Could not update application.' })
    }
  })

  app.post('/api/applications/:id/status', async (request, response) => {
    try {
      const existing = await prisma.application.findUnique({ where: { id: request.params.id } })
      if (!existing) return response.status(404).json({ success: false, message: 'Application not found.' })

      const newStatus = text(request.body?.status)
      if (!newStatus || !applicationStatuses.includes(newStatus)) {
        return response.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${applicationStatuses.join(', ')}`,
        })
      }

      const allowed = applicationTransitions[existing.status] || []
      if (!allowed.includes(newStatus)) {
        return response.status(409).json({
          success: false,
          message: `Cannot transition from '${existing.status}' to '${newStatus}'. Allowed: ${allowed.join(', ')}`,
        })
      }

      const updateData = { status: newStatus }
      if (newStatus === 'applied' && !existing.appliedAt) updateData.appliedAt = new Date()

      const application = await prisma.$transaction(async (tx) => {
        const app = await tx.application.update({
          where: { id: request.params.id },
          data: updateData,
          include: { job: { include: { company: true } } },
        })

        await tx.applicationActivity.create({
          data: {
            applicationId: app.id,
            type: 'status_change',
            description: `Status changed from '${existing.status}' to '${newStatus}'`,
            metadata: JSON.stringify({ from: existing.status, to: newStatus }),
          },
        })

        return app
      })

      response.json({ success: true, application })
    } catch (error) {
      console.error('Status change failed:', error)
      response.status(500).json({ success: false, message: 'Could not update application status.' })
    }
  })

  app.get('/api/applications/:id/activities', async (request, response) => {
    try {
      const application = await prisma.application.findUnique({ where: { id: request.params.id } })
      if (!application) return response.status(404).json({ success: false, message: 'Application not found.' })

      const activities = await prisma.applicationActivity.findMany({
        where: { applicationId: request.params.id },
        orderBy: { createdAt: 'desc' },
      })
      response.json({ success: true, activities })
    } catch (error) {
      console.error('Activity listing failed:', error)
      response.status(500).json({ success: false, message: 'Could not load activities.' })
    }
  })

  // ══════════════════════════════════════════
  // MODULE 16: Dashboard Summary
  // ══════════════════════════════════════════

  app.get('/api/dashboard', async (_request, response) => {
    try {
      const [
        totalJobs, eligibleJobs, savedJobs,
        topMatches, strongMatches,
        applicationsByStatus,
        pendingApprovals, sentOutreach,
        pendingFollowUps, overdueFollowUps,
        totalContacts,
      ] = await prisma.$transaction([
        prisma.job.count(),
        prisma.job.count({ where: { filterStatus: 'eligible' } }),
        prisma.job.count({ where: { isSaved: true } }),
        prisma.job.count({ where: { matchRating: 'Top Match' } }),
        prisma.job.count({ where: { matchRating: { in: ['Top Match', 'Strong Match'] } } }),
        prisma.application.groupBy({ by: ['status'], _count: true }),
        prisma.outreach.count({ where: { status: 'pending_approval' } }),
        prisma.outreach.count({ where: { status: 'sent' } }),
        prisma.followUp.count({ where: { status: 'pending', scheduledAt: { gte: new Date() } } }),
        prisma.followUp.count({ where: { status: 'pending', scheduledAt: { lt: new Date() } } }),
        prisma.contact.count(),
      ])

      const upcomingInterviews = await prisma.application.count({
        where: { interviewAt: { gte: new Date() }, status: { in: ['interview', 'assessment'] } },
      })

      response.json({
        success: true,
        dashboard: {
          jobs: { total: totalJobs, eligible: eligibleJobs, saved: savedJobs, topMatches, strongMatches },
          applications: Object.fromEntries(applicationsByStatus.map(g => [g.status, g._count])),
          upcomingInterviews,
          outreach: { pendingApprovals, sent: sentOutreach },
          followUps: { pending: pendingFollowUps, overdue: overdueFollowUps },
          contacts: totalContacts,
        },
      })
    } catch (error) {
      console.error('Dashboard failed:', error)
      response.status(500).json({ success: false, message: 'Could not load dashboard.' })
    }
  })

  // ══════════════════════════════════════════
  // MODULE 17: Analytics
  // ══════════════════════════════════════════

  function parseDateRange(query) {
    const rangeMap = { '7d': 7, '30d': 30, '90d': 90 }
    const range = query.range
    if (range && rangeMap[range]) {
      const from = new Date()
      from.setDate(from.getDate() - rangeMap[range])
      return { from, to: new Date() }
    }
    if (query.from) {
      const from = new Date(query.from)
      const to = query.to ? new Date(query.to) : new Date()
      if (!isNaN(from.getTime())) return { from, to: isNaN(to.getTime()) ? new Date() : to }
    }
    return { from: null, to: null }
  }

  function buildDateFilter(from, to) {
    if (!from && !to) return undefined
    const filter = {}
    if (from) filter.gte = from
    if (to) filter.lte = to
    return filter
  }

  app.get('/api/analytics/overview', async (request, response) => {
    try {
      const { from, to } = parseDateRange(request.query)
      const dateFilter = buildDateFilter(from, to)

      const [
        jobsDiscovered, jobsShortlisted, applicationCount,
        interviewCount, offerCount, outreachCreated,
        outreachSent, followUpsCompleted,
      ] = await prisma.$transaction([
        prisma.job.count({ where: dateFilter ? { discoveredAt: dateFilter } : {} }),
        prisma.job.count({ where: { isSaved: true, ...(dateFilter ? { updatedAt: dateFilter } : {}) } }),
        prisma.application.count({ where: dateFilter ? { createdAt: dateFilter } : {} }),
        prisma.application.count({ where: { status: 'interview', ...(dateFilter ? { updatedAt: dateFilter } : {}) } }),
        prisma.application.count({ where: { status: 'offer', ...(dateFilter ? { updatedAt: dateFilter } : {}) } }),
        prisma.outreach.count({ where: dateFilter ? { createdAt: dateFilter } : {} }),
        prisma.outreach.count({ where: { status: 'sent', ...(dateFilter ? { sentAt: dateFilter } : {}) } }),
        prisma.followUp.count({ where: { status: 'completed', ...(dateFilter ? { completedAt: dateFilter } : {}) } }),
      ])

      const totalApplied = await prisma.application.count({
        where: {
          status: { in: ['applied', 'assessment', 'interview', 'offer', 'rejected'] },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      })

      const conversionRate = totalApplied > 0
        ? Number(((interviewCount / totalApplied) * 100).toFixed(1))
        : null

      response.json({
        success: true,
        analytics: {
          period: { from: from?.toISOString() || null, to: to?.toISOString() || null },
          jobsDiscovered,
          jobsShortlisted,
          applications: applicationCount,
          interviews: interviewCount,
          offers: offerCount,
          outreachDrafts: outreachCreated,
          outreachSent,
          followUpsCompleted,
          interviewConversionRate: conversionRate,
        },
      })
    } catch (error) {
      console.error('Analytics overview failed:', error)
      response.status(500).json({ success: false, message: 'Could not load analytics.' })
    }
  })

  app.get('/api/analytics/applications', async (_request, response) => {
    try {
      const byStatus = await prisma.application.groupBy({ by: ['status'], _count: true })
      response.json({
        success: true,
        analytics: { byStatus: Object.fromEntries(byStatus.map(g => [g.status, g._count])) },
      })
    } catch (error) {
      console.error('Application analytics failed:', error)
      response.status(500).json({ success: false, message: 'Could not load application analytics.' })
    }
  })

  app.get('/api/analytics/outreach', async (_request, response) => {
    try {
      const byStatus = await prisma.outreach.groupBy({ by: ['status'], _count: true })
      const byType = await prisma.outreach.groupBy({ by: ['messageType'], _count: true })
      const sentCount = await prisma.outreach.count({ where: { status: 'sent' } })
      const respondedCount = await prisma.outreach.count({ where: { responseStatus: { not: null } } })
      const responseRate = sentCount > 0 ? Number(((respondedCount / sentCount) * 100).toFixed(1)) : null

      response.json({
        success: true,
        analytics: {
          byStatus: Object.fromEntries(byStatus.map(g => [g.status, g._count])),
          byType: Object.fromEntries(byType.map(g => [g.messageType, g._count])),
          responseRate,
          sent: sentCount,
          responded: respondedCount,
        },
      })
    } catch (error) {
      console.error('Outreach analytics failed:', error)
      response.status(500).json({ success: false, message: 'Could not load outreach analytics.' })
    }
  })

  // ══════════════════════════════════════════
  // MODULE 18: Backup & Restore
  // ══════════════════════════════════════════

  app.get('/api/backup/list', async (_request, response) => {
    try {
      await mkdir(defaultBackupDir, { recursive: true })
      const files = await readdir(defaultBackupDir)
      const backups = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const manifestPath = path.join(defaultBackupDir, file)
            const content = await readFile(manifestPath, 'utf8')
            const manifest = JSON.parse(content)
            backups.push({ filename: file, ...manifest })
          } catch { /* skip invalid manifests */ }
        }
      }

      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      response.json({ success: true, backups, backupDir: defaultBackupDir })
    } catch (error) {
      console.error('Backup listing failed:', error)
      response.status(500).json({ success: false, message: 'Could not list backups.' })
    }
  })

  app.post('/api/backup/create', async (_request, response) => {
    try {
      await mkdir(defaultBackupDir, { recursive: true })
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const dbSource = path.resolve(dataDirectory, 'orion.db')
      const dbDest = path.join(defaultBackupDir, `orion_${timestamp}.db`)
      const manifestDest = path.join(defaultBackupDir, `orion_${timestamp}.json`)

      // Ensure no pending writes
      try { await prisma.$queryRaw`SELECT 1` } catch { /* optional */ }

      await copyFile(dbSource, dbDest)

      // Generate checksum
      const dbContent = await readFile(dbDest)
      const checksum = createHash('sha256').update(dbContent).digest('hex')

      // Collect uploaded files list
      const uploadsDir = path.resolve(dataDirectory, 'uploads')
      let uploadedFiles = []
      try {
        const resumeDir = path.join(uploadsDir, 'resumes')
        if (existsSync(resumeDir)) {
          const files = await readdir(resumeDir)
          uploadedFiles = files.map(f => `uploads/resumes/${f}`)
        }
      } catch { /* no uploads */ }

      const manifest = {
        version: '1.0',
        appVersion: '0.1.0',
        createdAt: new Date().toISOString(),
        database: path.basename(dbDest),
        databaseChecksum: checksum,
        uploadedFiles,
        fileCount: uploadedFiles.length,
      }

      await writeFile(manifestDest, JSON.stringify(manifest, null, 2))
      response.status(201).json({ success: true, backup: manifest, path: manifestDest })
    } catch (error) {
      console.error('Backup creation failed:', error)
      response.status(500).json({ success: false, message: 'Could not create backup.' })
    }
  })

  app.post('/api/backup/restore', async (request, response) => {
    try {
      const { manifestFile } = request.body ?? {}
      if (!manifestFile || typeof manifestFile !== 'string') {
        return response.status(400).json({ success: false, message: 'manifestFile is required.' })
      }

      // Path traversal prevention
      const baseName = path.basename(manifestFile)
      const manifestPath = path.join(defaultBackupDir, baseName)

      if (!existsSync(manifestPath)) {
        return response.status(404).json({ success: false, message: 'Backup manifest not found.' })
      }

      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
      const dbBackupPath = path.join(defaultBackupDir, manifest.database)

      if (!existsSync(dbBackupPath)) {
        return response.status(404).json({ success: false, message: 'Backup database file not found.' })
      }

      // Verify checksum
      if (manifest.databaseChecksum) {
        const content = await readFile(dbBackupPath)
        const checksum = createHash('sha256').update(content).digest('hex')
        if (checksum !== manifest.databaseChecksum) {
          return response.status(422).json({
            success: false,
            message: 'Backup checksum verification failed. File may be corrupted.',
          })
        }
      }

      // Pre-restore backup of current state
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const preRestorePath = path.join(defaultBackupDir, `orion_pre_restore_${ts}.db`)
      const dbCurrentPath = path.resolve(dataDirectory, 'orion.db')
      await copyFile(dbCurrentPath, preRestorePath)

      // Disconnect, restore, reconnect
      await prisma.$disconnect()
      await copyFile(dbBackupPath, dbCurrentPath)
      await prisma.$connect()

      // Verify restored DB
      await prisma.$queryRaw`SELECT 1`

      response.json({
        success: true,
        message: 'Database restored successfully.',
        preRestoreBackup: path.basename(preRestorePath),
        restoredFrom: manifest.database,
      })
    } catch (error) {
      try { await prisma.$connect() } catch { /* best effort reconnect */ }
      console.error('Restore failed:', error)
      response.status(500).json({ success: false, message: 'Could not restore backup.' })
    }
  })
}
