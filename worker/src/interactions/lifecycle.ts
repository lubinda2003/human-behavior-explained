import type { LifecycleState } from './types';

export class InvalidLifecycleTransitionError extends Error {
  constructor(
    public readonly fromState: LifecycleState,
    public readonly toState: LifecycleState,
    public readonly interactionId?: string,
  ) {
    super(
      `Invalid lifecycle transition from ${fromState} to ${toState}${
        interactionId ? ` for interaction ${interactionId}` : ''
      }`,
    );
    this.name = 'InvalidLifecycleTransitionError';
  }
}

/**
 * Strict state transition mapping:
 * DRAFT -> VALIDATED -> PUBLISHED -> OPEN -> CLOSED -> RESOLVING -> RESULT_POSTED -> COMPLETED
 * Terminal error/cancel states allowed from non-completed states.
 */
const VALID_TRANSITIONS: Record<LifecycleState, readonly LifecycleState[]> = {
  DRAFT: ['VALIDATED', 'FAILED', 'CANCELLED'],
  VALIDATED: ['PUBLISHED', 'OPEN', 'FAILED', 'CANCELLED'],
  PUBLISHED: ['OPEN', 'CLOSED', 'FAILED', 'CANCELLED'],
  OPEN: ['CLOSED', 'FAILED', 'CANCELLED'],
  CLOSED: ['RESOLVING', 'FAILED', 'CANCELLED'],
  RESOLVING: ['RESULT_POSTED', 'COMPLETED', 'FAILED'],
  RESULT_POSTED: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  if (from === to) return true; // Idempotent same-state check
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidTransition(
  from: LifecycleState,
  to: LifecycleState,
  interactionId?: string,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidLifecycleTransitionError(from, to, interactionId);
  }
}
