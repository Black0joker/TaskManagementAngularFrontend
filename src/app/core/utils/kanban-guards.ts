import type { ProjectMemberRole, TaskItemStatus } from '../models/api.models';

// Sourced from Domain/Rules/TaskStatusTransitions.cs + guide §4.
const CHAIN: Record<TaskItemStatus, number> = {
  Todo: 0,
  InProgress: 1,
  InReview: 2,
  Done: 3,
  Cancelled: -1,
};

export function isSameStatus(from: TaskItemStatus, to: TaskItemStatus): boolean {
  return from === to;
}

/** Backward = needs project Owner/Admin. Forward = any contributor can do. */
export function isBackwardMove(from: TaskItemStatus, to: TaskItemStatus): boolean {
  if (from === to) return false;
  if (from === 'Cancelled') return true; // resurrect
  if (to === 'Cancelled') return from === 'Done'; // active->Cancelled ok, Done->Cancelled is backward
  return (CHAIN[from] ?? -1) > (CHAIN[to] ?? -1);
}

export function isOwnerOrAdmin(role: ProjectMemberRole | null | undefined): boolean {
  return role === 'Owner' || role === 'Admin';
}

export function canTransition(
  from: TaskItemStatus,
  to: TaskItemStatus,
  projectRole: ProjectMemberRole | null | undefined,
): { allowed: boolean; reason?: string } {
  if (from === to) return { allowed: true };
  if (isBackwardMove(from, to) && !isOwnerOrAdmin(projectRole)) {
    return { allowed: false, reason: 'Requires project Owner/Admin role' };
  }
  return { allowed: true };
}

export function isDoneLike(status: TaskItemStatus): boolean {
  return status === 'Done' || status === 'Cancelled';
}
