import { describe, expect, it } from 'vitest';
import { toTaskHttpParams } from './http-params';

describe('toTaskHttpParams', () => {
  it('clamps pageSize to 100 and defaults page to 1', () => {
    const p = toTaskHttpParams({ pageSize: 1000 });
    expect(p.get('pageSize')).toBe('100');
    expect(p.get('page')).toBe('1');
  });

  it('serializes filters as strings', () => {
    const p = toTaskHttpParams({
      projectId: 'abc',
      status: 'InProgress',
      sortBy: 'dueDate',
      sortDirection: 'asc',
      search: 'checkout',
      overdue: true,
    });
    expect(p.get('projectId')).toBe('abc');
    expect(p.get('status')).toBe('InProgress');
    expect(p.get('overdue')).toBe('true');
    expect(p.get('search')).toBe('checkout');
  });

  it('omits empty values', () => {
    const p = toTaskHttpParams({});
    expect(p.get('search')).toBeNull();
    expect(p.get('status')).toBeNull();
  });
});
