import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { ProjectMemberResponse, ProjectMemberRole } from '../models/api.models';
import { isOwnerOrAdmin } from '../utils/kanban-guards';

interface ProjectRoleState {
  projectId: string | null;
  members: ProjectMemberResponse[];
  myRole: ProjectMemberRole | null;
  loading: boolean;
}

const initial: ProjectRoleState = { projectId: null, members: [], myRole: null, loading: false };

export const ProjectRoleStore = signalStore(
  { providedIn: 'root' },
  withState(initial),
  withComputed((s) => ({
    isOwnerOrAdmin: computed(() => isOwnerOrAdmin(s.myRole())),
    memberById: computed(() => new Map(s.members().map((m) => [m.userId, m]))),
  })),
  withMethods((s) => ({
    setLoading(projectId: string): void {
      patchState(s, { projectId, loading: true });
    },
    setResolved(projectId: string, members: ProjectMemberResponse[], myRole: ProjectMemberRole | null): void {
      patchState(s, { projectId, members, myRole, loading: false });
    },
    reset(): void {
      patchState(s, { ...initial });
    },
  })),
);
