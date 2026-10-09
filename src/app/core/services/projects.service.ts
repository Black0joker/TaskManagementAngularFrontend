import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  CreateProjectCommand,
  CreateProjectLabelRequest,
  UpdateProjectCommand,
} from '../models/api-requests';
import type {
  ProjectLabelSummary,
  ProjectResponse,
  ProjectTaskSummary,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/projects`;

  list(): Observable<ProjectResponse[]> {
    return this.http.get<ProjectResponse[]>(this.base);
  }

  get(id: string): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${this.base}/${id}`);
  }

  create(body: CreateProjectCommand): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(this.base, body);
  }

  update(id: string, body: UpdateProjectCommand): Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  listTasks(id: string): Observable<ProjectTaskSummary[]> {
    return this.http.get<ProjectTaskSummary[]>(`${this.base}/${id}/tasks`);
  }

  listLabels(id: string): Observable<ProjectLabelSummary[]> {
    return this.http.get<ProjectLabelSummary[]>(`${this.base}/${id}/labels`);
  }

  createLabel(id: string, body: CreateProjectLabelRequest): Observable<ProjectLabelSummary> {
    return this.http.post<ProjectLabelSummary>(`${this.base}/${id}/labels`, body);
  }
}
