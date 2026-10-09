import type {
  ProjectMemberRole,
  SortDirection,
  TaskItemPriority,
  TaskItemStatus,
  TaskSortBy,
} from './api.models';

// §3.1
export interface RegisterCommand {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
}
export interface LoginCommand {
  email: string;
  password: string;
}
export interface RefreshCommand {
  refreshToken: string;
}
export interface LogoutCommand {
  refreshToken: string;
}

// §3.3
export interface CreateProjectCommand {
  name: string;
  description?: string | null;
}
export interface UpdateProjectCommand {
  id: string;
  name: string;
  description?: string | null;
}
export interface CreateProjectLabelRequest {
  name: string;
  color: string;
}

// §3.4
export interface AddProjectMemberRequest {
  userId: string;
  role: ProjectMemberRole;
}
export interface UpdateProjectMemberRoleRequest {
  role: ProjectMemberRole;
}

// §3.5
export interface CreateTaskCommand {
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskItemStatus;
  priority: TaskItemPriority;
  assignedToId?: string | null;
  dueDate?: string | null;
}
export interface UpdateTaskRequest {
  title: string;
  description?: string | null;
  status: TaskItemStatus;
  priority: TaskItemPriority;
  assignedToId?: string | null;
  dueDate?: string | null;
}
export interface UpdateTaskStatusRequest {
  status: TaskItemStatus;
}
export interface UpdateTaskPriorityRequest {
  priority: TaskItemPriority;
}
export interface UpdateTaskAssigneeRequest {
  userId: string | null;
}
export interface UpdateTaskDueDateRequest {
  dueDate: string | null;
}

// §3.5 comments + §3.6/§3.7
export interface CreateCommentRequest {
  content: string;
}
export interface UpdateCommentRequest {
  content: string;
}
export interface UpdateLabelRequest {
  name: string;
  color: string;
}

export interface TaskQueryParams {
  projectId?: string;
  overdue?: boolean;
  dueToday?: boolean;
  dueThisWeek?: boolean;
  noDueDate?: boolean;
  dueBefore?: string;
  dueAfter?: string;
  page?: number;
  pageSize?: number;
  status?: TaskItemStatus;
  priority?: TaskItemPriority;
  assignedToId?: string;
  createdById?: string;
  labelId?: string;
  dueFrom?: string;
  dueTo?: string;
  sortBy?: TaskSortBy;
  sortDirection?: SortDirection;
  search?: string;
}

export interface CommentQueryParams {
  page?: number;
  pageSize?: number;
}
