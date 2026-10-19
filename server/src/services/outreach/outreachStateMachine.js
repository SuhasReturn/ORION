/**
 * Outreach state machine.
 * Manages the lifecycle of outreach messages from draft to sent.
 * 
 * States: draft → pending_approval → approved → sending → sent
 *                                  → rejected → (edit) → draft
 *                                  → cancelled
 *         approved → cancelled
 *         sending → failed
 *
 * Integrity: If an approved message is edited, approval is invalidated.
 */
import { createHash } from 'node:crypto'

export const OUTREACH_STATES = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

const VALID_TRANSITIONS = {
  draft: ['pending_approval', 'cancelled'],
  pending_approval: ['approved', 'rejected', 'cancelled'],
  approved: ['sending', 'cancelled', 'draft'],
  rejected: ['draft'],
  sending: ['sent', 'failed'],
  sent: [],
  failed: ['draft', 'sending'],
  cancelled: ['draft'],
}

/**
 * Checks whether a state transition is permitted.
 */
export function isValidTransition(fromState, toState) {
  const allowed = VALID_TRANSITIONS[fromState]
  return allowed ? allowed.includes(toState) : false
}

/**
 * Computes a SHA-256 hash of the message content for approval integrity.
 */
export function computeContentHash(subject, message) {
  return createHash('sha256')
    .update(`${subject || ''}::${message || ''}`)
    .digest('hex')
}

/**
 * Verifies that the current content matches the approved content hash.
 */
export function isApprovalValid(outreach) {
  if (outreach.status !== OUTREACH_STATES.APPROVED) return false
  if (!outreach.approvedContentHash) return false

  const currentHash = computeContentHash(outreach.subject, outreach.message)
  return currentHash === outreach.approvedContentHash
}

/**
 * Gets the list of valid next states from a given state.
 */
export function getValidNextStates(currentState) {
  return VALID_TRANSITIONS[currentState] || []
}

/**
 * Returns all valid outreach states.
 */
export function getAllStates() {
  return Object.values(OUTREACH_STATES)
}
