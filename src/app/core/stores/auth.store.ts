import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { CurrentUserResponse } from '../models/api.models';

interface AuthState {
  user: CurrentUserResponse | null;
}

const initial: AuthState = { user: null };

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initial),
  withComputed((s) => ({
    isLoggedIn: computed(() => s.user() !== null),
    roles: computed(() => s.user()?.roles ?? []),
    isAdmin: computed(() => (s.user()?.roles ?? []).includes('Admin')),
    displayName: computed(() => {
      const u = s.user();
      return u ? `${u.firstName} ${u.lastName}`.trim() || u.email : '';
    }),
  })),
  withMethods((s) => ({
    setUser(user: CurrentUserResponse | null): void {
      patchState(s, { user });
    },
    clear(): void {
      patchState(s, { user: null });
    },
  })),
);
