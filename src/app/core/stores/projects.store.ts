import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import type { ProjectResponse } from '../models/api.models';

interface ProjectsState {
  projects: ProjectResponse[];
  loading: boolean;
  search: string;
  error: string | null;
}

const initial: ProjectsState = { projects: [], loading: false, search: '', error: null };

export const ProjectsStore = signalStore(
  { providedIn: 'root' },
  withState(initial),
  withMethods((s) => ({
    setLoading(loading: boolean): void {
      patchState(s, { loading });
    },
    setProjects(projects: ProjectResponse[]): void {
      patchState(s, { projects, loading: false, error: null });
    },
    setError(error: string | null): void {
      patchState(s, { error, loading: false });
    },
    setSearch(search: string): void {
      patchState(s, { search });
    },
    upsert(project: ProjectResponse): void {
      const exists = s.projects().some((p) => p.id === project.id);
      patchState(s, {
        projects: exists
          ? s.projects().map((p) => (p.id === project.id ? project : p))
          : [project, ...s.projects()],
      });
    },
    remove(id: string): void {
      patchState(s, { projects: s.projects().filter((p) => p.id !== id) });
    },
  })),
);
