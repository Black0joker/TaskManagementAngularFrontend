import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { lastValueFrom, of, throwError, isObservable } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStore } from '../stores/auth.store';
import { TokenStorageService } from '../services/token-storage.service';
import { UsersService } from '../services/users.service';
import { authGuard, guestGuard } from './auth.guard';

function setup(opts: { accessToken: string | null; user?: boolean; me?: 'ok' | 'offline' | 'unauthorized' }) {
  const meError =
    opts.me === 'offline'
      ? new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })
      : new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
  const usersStub = {
    meShared: vi.fn(() =>
      opts.me === 'ok'
        ? of({ id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B', roles: ['User'] })
        : throwError(() => meError),
    ),
  };
  const tokensStub = { accessToken: opts.accessToken, refreshToken: null, accessTokenExpiresAtUtc: null };
  const trees: { commands: unknown[]; queryParams?: unknown }[] = [];
  const routerStub = {
    createUrlTree: vi.fn((commands: unknown[], extras?: { queryParams?: unknown }) => {
      const tree = { commands, queryParams: extras?.queryParams };
      trees.push(tree);
      return tree;
    }),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: TokenStorageService, useValue: tokensStub },
      { provide: UsersService, useValue: usersStub },
      { provide: Router, useValue: routerStub },
    ],
  });
  const store = TestBed.inject(AuthStore);
  store.clear();
  if (opts.user) {
    store.setUser({ id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B', roles: ['User'] });
  }
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/projects' } as RouterStateSnapshot;
  return { store, usersStub, trees, route, state };
}

async function runGuard(
  guard: typeof authGuard,
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): Promise<unknown> {
  const res = TestBed.runInInjectionContext(() => guard(route, state));
  return isObservable(res) ? await lastValueFrom(res) : res;
}

describe('authGuard (no redirect storms)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('redirects to /login without calling me when no token', async () => {
    const { usersStub, trees, route, state } = setup({ accessToken: null });
    const res = (await runGuard(authGuard, route, state)) as { commands: unknown[] };
    expect(usersStub.meShared).not.toHaveBeenCalled();
    expect(res.commands).toEqual(['/login']);
  });

  it('allows navigation without calling me when session is proven', async () => {
    const { usersStub, route, state } = setup({ accessToken: 'tok', user: true });
    expect(await runGuard(authGuard, route, state)).toBe(true);
    expect(usersStub.meShared).not.toHaveBeenCalled();
  });

  it('lands on /login?reason=offline when the API is unreachable (status 0)', async () => {
    const { usersStub, route, state } = setup({ accessToken: 'tok', me: 'offline' });
    const res = (await runGuard(authGuard, route, state)) as {
      commands: unknown[];
      queryParams: Record<string, string>;
    };
    expect(usersStub.meShared).toHaveBeenCalledTimes(1);
    expect(res.commands).toEqual(['/login']);
    expect(res.queryParams['reason']).toBe('offline');
  });

  it('lands on plain /login for real auth failures (401)', async () => {
    const { usersStub, route, state } = setup({ accessToken: 'tok', me: 'unauthorized' });
    const res = (await runGuard(authGuard, route, state)) as {
      commands: unknown[];
      queryParams: Record<string, string>;
    };
    expect(usersStub.meShared).toHaveBeenCalledTimes(1);
    expect(res.commands).toEqual(['/login']);
    expect(res.queryParams['reason']).toBeUndefined();
  });
});

describe('guestGuard (no ping-pong with authGuard)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('bounces to /projects only with a proven session', async () => {
    const { route, state } = setup({ accessToken: 'tok', user: true });
    const res = (await runGuard(guestGuard, route, state)) as { commands: unknown[] };
    expect(res.commands).toEqual(['/projects']);
  });

  it('renders login for a stale token with no proven session (breaks the loop)', async () => {
    const { usersStub, route, state } = setup({ accessToken: 'tok' });
    expect(await runGuard(guestGuard, route, state)).toBe(true);
    expect(usersStub.meShared).not.toHaveBeenCalled();
  });

  it('renders login when logged out', async () => {
    const { route, state } = setup({ accessToken: null });
    expect(await runGuard(guestGuard, route, state)).toBe(true);
  });
});
