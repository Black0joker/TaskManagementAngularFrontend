import { describe, expect, it } from 'vitest';
import { canTransition, isBackwardMove, isOwnerOrAdmin } from './kanban-guards';

describe('kanban-guards (§4 status chain)', () => {
  it('treats same-status as no-op (not backward)', () => {
    expect(isBackwardMove('Todo', 'Todo')).toBe(false);
    expect(isBackwardMove('Done', 'Done')).toBe(false);
  });

  it('treats forward steps (incl. skipping) as forward', () => {
    expect(isBackwardMove('Todo', 'InProgress')).toBe(false);
    expect(isBackwardMove('Todo', 'Done')).toBe(false);
    expect(isBackwardMove('InProgress', 'InReview')).toBe(false);
  });

  it('allows active -> Cancelled except from Done', () => {
    expect(isBackwardMove('Todo', 'Cancelled')).toBe(false);
    expect(isBackwardMove('InReview', 'Cancelled')).toBe(false);
    expect(isBackwardMove('Done', 'Cancelled')).toBe(true);
  });

  it('treats steps down + resurrect as backward', () => {
    expect(isBackwardMove('InReview', 'Todo')).toBe(true);
    expect(isBackwardMove('Done', 'InProgress')).toBe(true);
    expect(isBackwardMove('Cancelled', 'Todo')).toBe(true);
  });

  it('gates backward moves on Owner/Admin', () => {
    expect(canTransition('Done', 'InProgress', 'Member').allowed).toBe(false);
    expect(canTransition('Done', 'InProgress', 'Viewer').allowed).toBe(false);
    expect(canTransition('Done', 'InProgress', 'Owner').allowed).toBe(true);
    expect(canTransition('Done', 'InProgress', 'Admin').allowed).toBe(true);
    expect(canTransition('Todo', 'Done', 'Member').allowed).toBe(true);
  });

  it('detects Owner/Admin', () => {
    expect(isOwnerOrAdmin('Owner')).toBe(true);
    expect(isOwnerOrAdmin('Admin')).toBe(true);
    expect(isOwnerOrAdmin('Member')).toBe(false);
    expect(isOwnerOrAdmin(null)).toBe(false);
  });
});
