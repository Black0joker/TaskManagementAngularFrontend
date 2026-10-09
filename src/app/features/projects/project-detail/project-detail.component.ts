import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectsService } from '../../../core/services/projects.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthStore } from '../../../core/stores/auth.store';
import { ProjectRoleStore } from '../../../core/stores/project-role.store';
import type { ProjectResponse, ProjectTaskSummary } from '../../../core/models/api.models';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { AppIconComponent } from '../../../shared/ui/icon/app-icon.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ProjectFormComponent } from '../project-form/project-form.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DatePipe, ProjectFormComponent, AppIconComponent, AvatarComponent, EmptyStateComponent, SkeletonComponent],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ProjectsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStore);
  private readonly roleStore = inject(ProjectRoleStore);

  readonly project = signal<ProjectResponse | null>(null);
  readonly tasks = signal<ProjectTaskSummary[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly editing = signal(false);
  readonly myRole = this.roleStore.myRole;
  private readonly formRef = viewChild<ProjectFormComponent>('pf');

  readonly doneCount = computed(() => this.tasks().filter((t) => t.status === 'Done').length);
  readonly openCount = computed(() => this.tasks().filter((t) => t.status !== 'Done' && t.status !== 'Cancelled').length);
  readonly overdueCount = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.tasks().filter(
      (t) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'Done' && t.status !== 'Cancelled',
    ).length;
  });
  readonly statusBars = computed(() => {
    const total = Math.max(1, this.tasks().length);
    const order = ['Todo', 'InProgress', 'InReview', 'Done', 'Cancelled'] as const;
    return order.map((s) => ({
      status: s,
      count: this.tasks().filter((t) => t.status === s).length,
      pct: (this.tasks().filter((t) => t.status === s).length / total) * 100,
    }));
  });

  statusPill(status: string): string {
    return (
      {
        Todo: 'pill-todo',
        InProgress: 'pill-progress',
        InReview: 'pill-review',
        Done: 'pill-done',
        Cancelled: 'pill-cancelled',
      }[status] ?? ''
    );
  }

  constructor() {
    this.reload();
    effect(() => {
      const f = this.formRef();
      const p = this.project();
      if (f && p && this.editing()) f.initForEdit(p.id, p.name, p.description);
    });
  }

  get id(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  reload(): void {
    this.loading.set(true);
    this.notFound.set(false);
    forkJoin({ p: this.api.get(this.id), t: this.api.listTasks(this.id) }).subscribe({
      next: ({ p, t }) => {
        this.project.set(p);
        this.tasks.set(t);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404 || err?.status === 403) this.notFound.set(true);
        else this.toast.error(err?.normalized?.message ?? 'Failed to load project.');
      },
    });
  }

  async remove(): Promise<void> {
    const p = this.project();
    if (!p) return;
    const ok = await this.confirm.confirm({
      title: 'Delete project',
      message: `Delete "${p.name}"?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.api.delete(p.id).subscribe({
      next: () => {
        this.toast.success('Project deleted.');
        void this.router.navigate(['/projects']);
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Delete failed.'),
    });
  }
}
