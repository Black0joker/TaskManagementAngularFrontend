import { HttpParams } from '@angular/common/http';
import type { CommentQueryParams, TaskQueryParams } from '../models/api-requests';

function setIf(params: HttpParams, key: string, value: unknown): HttpParams {
  if (value === undefined || value === null || value === '') return params;
  if (typeof value === 'boolean') return params.set(key, value ? 'true' : 'false');
  return params.set(key, String(value));
}

// Pagination is clamped server-side (page<1→1, pageSize<1→20, >100→100) —
// mirror the cap client-side so pageSize input never exceeds 100.
export function toTaskHttpParams(q: TaskQueryParams): HttpParams {
  let p = new HttpParams();
  p = setIf(p, 'projectId', q.projectId);
  p = setIf(p, 'overdue', q.overdue);
  p = setIf(p, 'dueToday', q.dueToday);
  p = setIf(p, 'dueThisWeek', q.dueThisWeek);
  p = setIf(p, 'noDueDate', q.noDueDate);
  p = setIf(p, 'dueBefore', q.dueBefore);
  p = setIf(p, 'dueAfter', q.dueAfter);
  p = setIf(p, 'page', q.page && q.page > 0 ? Math.floor(q.page) : 1);
  const size = q.pageSize ?? 20;
  p = setIf(p, 'pageSize', Math.min(100, Math.max(1, Math.floor(size))));
  p = setIf(p, 'status', q.status);
  p = setIf(p, 'priority', q.priority);
  p = setIf(p, 'assignedToId', q.assignedToId);
  p = setIf(p, 'createdById', q.createdById);
  p = setIf(p, 'labelId', q.labelId);
  p = setIf(p, 'dueFrom', q.dueFrom);
  p = setIf(p, 'dueTo', q.dueTo);
  p = setIf(p, 'sortBy', q.sortBy);
  p = setIf(p, 'sortDirection', q.sortDirection);
  p = setIf(p, 'search', q.search);
  return p;
}

export function toCommentHttpParams(q: CommentQueryParams): HttpParams {
  let p = new HttpParams();
  p = setIf(p, 'page', q.page && q.page > 0 ? Math.floor(q.page) : 1);
  const size = q.pageSize ?? 20;
  p = setIf(p, 'pageSize', Math.min(100, Math.max(1, Math.floor(size))));
  return p;
}
