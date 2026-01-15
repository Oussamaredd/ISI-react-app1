// Ticket state machine and business rules
export const TICKET_STATUSES = {
  OPEN: 'OPEN',
  COMPLETED: 'COMPLETED'
};

export const TICKET_TRANSITIONS = {
  // From OPEN
  [TICKET_STATUSES.OPEN]: {
    [TICKET_STATUSES.OPEN]: 'self', // Stay OPEN
    [TICKET_STATUSES.COMPLETED]: 'assignHotel' // Requires hotel assignment
  },
  // From COMPLETED
  [TICKET_STATUSES.COMPLETED]: {
    [TICKET_STATUSES.COMPLETED]: 'self', // Stay COMPLETED
    [TICKET_STATUSES.OPEN]: 'reopen' // Allow reopening
  }
};

/**
 * Check if a transition is allowed
 */
export function isValidTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  const allowedTransitions = TICKET_TRANSITIONS[fromStatus];
  return !!(allowedTransitions && allowedTransitions[toStatus] !== undefined);
}

/**
 * Get allowed transitions for a given status
 */
export function getAllowedTransitions(status) {
  return Object.keys(TICKET_TRANSITIONS[status] || {});
}

/**
 * Get next possible statuses for a ticket
 */
export function getNextPossibleStatuses(status) {
  return Object.keys(TICKET_TRANSITIONS[status] || []);
}

/**
 * Check if a ticket can be assigned to a hotel (must be OPEN)
 */
export function canAssignHotel(status) {
  return status === TICKET_STATUSES.OPEN;
}

/**
 * Check if a ticket can be reopened (must be COMPLETED)
 */
export function canReopen(status) {
  return status === TICKET_STATUSES.COMPLETED;
}