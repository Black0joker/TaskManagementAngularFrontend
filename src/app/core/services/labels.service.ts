import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { UpdateLabelRequest } from '../models/api-requests';
import type { ProjectLabelSummary } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class LabelsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/labels`;

  update(id: string, body: UpdateLabelRequest): Observable<ProjectLabelSummary> {
    return this.http.put<ProjectLabelSummary>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
