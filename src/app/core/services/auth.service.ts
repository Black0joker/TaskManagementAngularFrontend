import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  LoginCommand,
  LogoutCommand,
  RefreshCommand,
  RegisterCommand,
} from '../models/api-requests';
import type { AuthTokenResponse, RegisterResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/auth`;

  register(body: RegisterCommand): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.base}/register`, body);
  }

  login(body: LoginCommand): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${this.base}/login`, body);
  }

  refresh(body: RefreshCommand): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>(`${this.base}/refresh`, body);
  }

  logout(body: LogoutCommand): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, body);
  }
}
