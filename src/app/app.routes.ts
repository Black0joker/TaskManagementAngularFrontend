import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { projectRoleGuard } from './core/guards/project-role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'projects' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/projects/project-list/project-list.component').then((m) => m.ProjectListComponent),
  },
  {
    path: 'projects/:id',
    canActivate: [authGuard, projectRoleGuard],
    loadComponent: () =>
      import('./features/projects/project-detail/project-detail.component').then((m) => m.ProjectDetailComponent),
  },
  {
    path: 'projects/:id/board',
    canActivate: [authGuard, projectRoleGuard],
    loadComponent: () =>
      import('./features/tasks/task-board/task-board.component').then((m) => m.TaskBoardComponent),
  },
  {
    path: 'projects/:id/list',
    canActivate: [authGuard, projectRoleGuard],
    loadComponent: () =>
      import('./features/tasks/task-list/task-list.component').then((m) => m.TaskListComponent),
  },
  {
    path: 'projects/:id/members',
    canActivate: [authGuard, projectRoleGuard],
    loadComponent: () =>
      import('./features/project-members/project-members.component').then((m) => m.ProjectMembersComponent),
  },
  {
    path: 'projects/:id/labels',
    canActivate: [authGuard, projectRoleGuard],
    loadComponent: () =>
      import('./features/project-labels/project-labels.component').then((m) => m.ProjectLabelsComponent),
  },
  {
    path: 'tasks/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tasks/task-detail/task-detail.component').then((m) => m.TaskDetailComponent),
  },
  {
    path: '403',
    loadComponent: () => import('./shell/forbidden.component').then((m) => m.ForbiddenComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./shell/not-found.component').then((m) => m.NotFoundComponent),
  },
];
