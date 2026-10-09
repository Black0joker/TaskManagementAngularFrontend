// Domain models — mirrors FRONTEND_API_GUIDE.md §2. Wire format is camelCase.
// All entity/user IDs are opaque strings. Enums are string unions, never ordinals.

export type TaskItemStatus = 'Todo' | 'InProgress' | 'InReview' | 'Done' | 'Cancelled';
export type TaskItemPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ProjectMemberRole = 'Owner' | 'Admin' | 'Member' | 'Viewer';

export const TASK_STATUSES: TaskItemStatus[] = ['Todo', 'InProgress', 'InReview', 'Done', 'Cancelled'];
export const TASK_PRIORITIES: TaskItemPriority[] = ['Low', 'Medium', 'High', 'Critical'];
export const PROJECT_ROLES: ProjectMemberRole[] = ['Owner', 'Admin', 'Member', 'Viewer'];

export const TASK_SORT_FIELDS = ['title', 'status', 'priority', 'dueDate', 'createdAt'] as const;
export type TaskSortBy = (typeof TASK_SORT_FIELDS)[number];
export type SortDirection = 'asc' | 'desc';

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  tokenType: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTaskSummary {
  id: string;
  title: string;
  description: string | null;
  status: TaskItemStatus;
  priority: TaskItemPriority;
  dueDate: string | null;
  assignedToId: string | null;
  createdAt: string;
}

export interface ProjectLabelSummary {
  id: string;
  name: string;
  color: string;
}

export interface ProjectMemberResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: ProjectMemberRole;
}

export interface TaskAssigneeDto {
  id: string;
  name: string;
}

export interface TaskLabelDto {
  id: string;
  name: string;
  color: string;
}

export interface TaskResponse {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskItemStatus;
  priority: TaskItemPriority;
  dueDate: string | null;
  assignedTo: TaskAssigneeDto | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetailsResponse extends TaskResponse {
  labels: TaskLabelDto[];
}

export interface CommentResponse {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function emptyPage<T>(page = 1, pageSize = 20): PagedResult<T> {
  return {
    items: [],
    page,
    pageSize,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}
