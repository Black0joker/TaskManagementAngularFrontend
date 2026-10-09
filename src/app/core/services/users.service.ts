import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CurrentUserResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/users`;

  me(): Observable<CurrentUserResponse> {
    return this.http.get<CurrentUserResponse>(`${this.base}/me`);
  }
}
