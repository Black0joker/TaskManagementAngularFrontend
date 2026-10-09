import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ProjectMembersService } from '../services/project-members.service';
import { AuthStore } from '../stores/auth.store';
import { ProjectRoleStore } from '../stores/project-role.store';

// Resolves GET /projects/{id}/members and caches the current user's project role.
// Route must provide :id param. Components still handle 403/404 defensively.
export const projectRoleGuard: CanActivateFn = (route) => {
  const projectId = route.paramMap.get('id') ?? route.paramMap.get('projectId') ?? '';
  const members = inject(ProjectMembersService);
  const auth = inject(AuthStore);
  const roleStore = inject(ProjectRoleStore);
  if (!projectId) return false;
  roleStore.setLoading(projectId);
  return members.list(projectId).pipe(
    map((list) => {
      const meId = auth.user()?.id;
      const mine = list.find((m) => m.userId === meId) ?? null;
      roleStore.setResolved(projectId, list, mine?.role ?? null);
      return true;
    }),
    catchError(() => {
      roleStore.setResolved(projectId, [], null);
      // Allow navigation so the page can render 403/404 state itself.
      return of(true);
    }),
  );
};
