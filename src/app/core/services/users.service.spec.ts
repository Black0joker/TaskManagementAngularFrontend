import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService.meShared', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UsersService],
    });
  });

  it('shares one in-flight request between concurrent callers', () => {
    const svc = TestBed.inject(UsersService);
    const http = TestBed.inject(HttpTestingController);
    const me = { id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B', roles: ['User'] };

    let first: unknown;
    let second: unknown;
    svc.meShared().subscribe((v) => (first = v));
    svc.meShared().subscribe((v) => (second = v));

    // Exactly ONE HTTP request despite two subscribers.
    const req = http.expectOne((r) => r.url.endsWith('/api/users/me'));
    expect(req.request.method).toBe('GET');
    req.flush(me);

    expect(first).toEqual(me);
    expect(second).toEqual(me);
    http.verify();
  });

  it('issues a fresh request after the previous one settles', () => {
    const svc = TestBed.inject(UsersService);
    const http = TestBed.inject(HttpTestingController);
    const me = { id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B', roles: ['User'] };

    svc.meShared().subscribe();
    http.expectOne((r) => r.url.endsWith('/api/users/me')).flush(me);

    svc.meShared().subscribe();
    http.expectOne((r) => r.url.endsWith('/api/users/me')).flush(me);
    http.verify();
  });
});
