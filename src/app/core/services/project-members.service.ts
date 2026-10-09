import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  AddProjectMemberRequest,
  UpdateProjectMemberRoleRequest,
} from '../models/api-requests';
import type { ProjectMemberResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ProjectMembersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/projects`;

  list(projectId: string): Observable<ProjectMemberResponse[]> {
    return this.http.get<ProjectMemberResponse[]>(`${this.base}/${projectId}/members`);
  }

  add(projectId: string, body: AddProjectMemberRequest): Observable<ProjectMemberResponse> {
    return this.http.post<ProjectMemberResponse>(`${this.base}/${projectId}/members`, body);
  }

  updateRole(
    projectId: string,
    userId: string,
    body: UpdateProjectMemberRoleRequest,
  ): Observable<ProjectMemberResponse> {
    return this.http.put<ProjectMemberResponse>(
      `${this.base}/${projectId}/members/${userId}`,
      body,
    );
  }

  remove(projectId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${projectId}/members/${userId}`);
  }
}
