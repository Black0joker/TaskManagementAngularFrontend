import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import type { TaskQueryParams } from '../models/api-requests';
import type { PagedResult, TaskResponse } from '../models/api.models';
import { emptyPage } from '../models/api.models';

interface TasksState {
  result: PagedResult<TaskResponse>;
  filters: TaskQueryParams;
  loading: boolean;
  error: string | null;
}

const initial: TasksState = {
  result: emptyPage<TaskResponse>(),
  filters: { page: 1, pageSize: 20, sortBy: 'createdAt', sortDirection: 'desc' },
  loading: false,
  error: null,
};

export const TasksStore = signalStore(
  { providedIn: 'root' },
  withState(initial),
  withMethods((s) => ({
    setLoading(loading: boolean): void {
      patchState(s, { loading });
    },
    setResult(result: PagedResult<TaskResponse>): void {
      patchState(s, { result, loading: false, error: null });
    },
    setError(error: string | null): void {
      patchState(s, { error, loading: false });
    },
    setFilters(filters: TaskQueryParams): void {
      patchState(s, { filters: { ...s.filters(), ...filters } });
    },
    resetFilters(projectId?: string): void {
      patchState(s, {
        filters: { page: 1, pageSize: 20, sortBy: 'createdAt', sortDirection: 'desc', projectId },
        result: emptyPage<TaskResponse>(),
      });
    },
    patchTask(updated: TaskResponse): void {
      patchState(s, { result: { ...s.result(), items: s.result().items.map((t) => (t.id === updated.id ? updated : t)) } });
    },
    removeTask(id: string): void {
      const items = s.result().items.filter((t) => t.id !== id);
      patchState(s, { result: { ...s.result(), items, totalCount: Math.max(0, s.result().totalCount - 1) } });
    },
  })),
);
