import { Injectable } from '@angular/core';

const ACCESS_KEY = 'tm.accessToken';
const REFRESH_KEY = 'tm.refreshToken';
const EXPIRY_KEY = 'tm.accessTokenExpiresAtUtc';

// localStorage per user decision (accepted XSS posture). Single place to swap
// to in-memory + boot-refresh later without touching call sites.
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }
  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }
  get accessTokenExpiresAtUtc(): string | null {
    return localStorage.getItem(EXPIRY_KEY);
  }

  save(accessToken: string, refreshToken: string, expiresAtUtc: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(EXPIRY_KEY, expiresAtUtc);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }

  isExpiredOrExpiringSoon(skewSeconds = 60): boolean {
    const raw = this.accessTokenExpiresAtUtc;
    if (!raw) return false;
    const exp = new Date(raw).getTime();
    if (Number.isNaN(exp)) return false;
    return exp - Date.now() < skewSeconds * 1000;
  }
}
