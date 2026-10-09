import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  CommentQueryParams,
  CreateCommentRequest,
  CreateTaskCommand,
  TaskQueryParams,
  UpdateTaskAssigneeRequest,
  UpdateTaskDueDateRequest,
  UpdateTaskPriorityRequest,
  UpdateTaskRequest,
  UpdateTaskStatusRequest,
} from '../models/api-requests';
import type {
  CommentResponse,
  PagedResult,
  TaskDetailsResponse,
  TaskResponse,
} from '../models/api.models';
import { toCommentHttpParams, toTaskHttpParams } from '../utils/http-params';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/tasks`;

  list(params: TaskQueryParams): Observable<PagedResult<TaskResponse>> {
    return this.http.get<PagedResult<TaskResponse>>(this.base, {
      params: toTaskHttpParams(params),
    });
  }

  getDetails(id: string): Observable<TaskDetailsResponse> {
    return this.http.get<TaskDetailsResponse>(`${this.base}/${id}`);
  }

  create(body: CreateTaskCommand): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(this.base, body);
  }

  fullUpdate(id: string, body: UpdateTaskRequest): Observable<TaskResponse> {
    return this.http.put<TaskResponse>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  patchStatus(id: string, body: UpdateTaskStatusRequest): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`${this.base}/${id}/status`, body);
  }

  patchPriority(id: string, body: UpdateTaskPriorityRequest): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`${this.base}/${id}/priority`, body);
  }

  patchAssignee(id: string, body: UpdateTaskAssigneeRequest): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`${this.base}/${id}/assignee`, body);
  }

  patchDueDate(id: string, body: UpdateTaskDueDateRequest): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`${this.base}/${id}/due-date`, body);
  }

  addLabel(id: string, labelId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/labels/${labelId}`, {});
  }

  removeLabel(id: string, labelId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/labels/${labelId}`);
  }

  listComments(id: string, q: CommentQueryParams = {}): Observable<PagedResult<CommentResponse>> {
    return this.http.get<PagedResult<CommentResponse>>(`${this.base}/${id}/comments`, {
      params: toCommentHttpParams(q),
    });
  }

  createComment(id: string, body: CreateCommentRequest): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${this.base}/${id}/comments`, body);
  }
}
