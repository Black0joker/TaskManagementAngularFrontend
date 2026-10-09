import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CurrentUserResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/users`;

  /** Single in-flight /users/me shared by concurrent callers (e.g. guards). */
  private meInFlight: Observable<CurrentUserResponse> | null = null;

  me(): Observable<CurrentUserResponse> {
    return this.http.get<CurrentUserResponse>(`${this.base}/me`);
  }

  meShared(): Observable<CurrentUserResponse> {
    if (!this.meInFlight) {
      this.meInFlight = this.me().pipe(
        finalize(() => (this.meInFlight = null)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.meInFlight;
  }
}
