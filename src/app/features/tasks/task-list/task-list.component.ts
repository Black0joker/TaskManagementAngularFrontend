import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { NgSelectComponent } from '@ng-select/ng-select';
import type { TaskQueryParams } from '../../../core/models/api-requests';
import {
  TASK_PRIORITIES,
  TASK_SORT_FIELDS,
  TASK_STATUSES,
} from '../../../core/models/api.models';
import { ProjectsService } from '../../../core/services/projects.service';
import { TasksService } from '../../../core/services/tasks.service';
import { ToastService } from '../../../core/services/toast.service';
import { TasksStore } from '../../../core/stores/tasks.store';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { DatePickerComponent } from '../../../shared/ui/date-picker/date-picker.component';
import type { DateRange } from '../../../shared/ui/date-picker/date-picker.utils';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { AppIconComponent } from '../../../shared/ui/icon/app-icon.component';
import { PagerComponent } from '../../../shared/ui/pager/pager.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { TaskFormComponent } from '../task-form/task-form.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, EmptyStateComponent, PagerComponent, TaskFormComponent, AppIconComponent, AvatarComponent, SkeletonComponent, NgSelectComponent, DatePickerComponent],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
})
export class TaskListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(TasksService);
  private readonly projects = inject(ProjectsService);
  private readonly toast = inject(ToastService);
  readonly store = inject(TasksStore);

  readonly statuses = TASK_STATUSES;
  readonly priorities = TASK_PRIORITIES;
  readonly sortFields = [...TASK_SORT_FIELDS];
  readonly sortDirections = [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' },
  ];
  readonly showCreate = signal(false);
  readonly filtersOpen = signal(false);
  readonly projectName = signal('');

  f: TaskQueryParams & { search?: string } = {
    page: 1, pageSize: 20, sortBy: 'createdAt', sortDirection: 'desc',
  };

  get projectId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  /** Range-picker bridge: keeps f.dueFrom/dueTo as the source of truth. */
  get dateRange(): DateRange {
    return { from: this.f.dueFrom ?? null, to: this.f.dueTo ?? null };
  }

  set dateRange(r: DateRange) {
    this.f.dueFrom = r.from ?? undefined;
    this.f.dueTo = r.to ?? undefined;
  }

  constructor() {
    this.store.resetFilters(this.projectId);
    this.f = { ...this.store.filters(), projectId: this.projectId };
    this.projects.get(this.projectId).subscribe({
      next: (p) => this.projectName.set(p.name),
      error: () => this.projectName.set(''),
    });
    this.load();
  }

  get activeFilterCount(): number {
    const f = this.store.filters();
    let n = 0;
    if (f.search) n++;
    if (f.status) n++;
    if (f.priority) n++;
    if (f.dueFrom || f.dueTo || f.dueBefore || f.dueAfter) n++;
    if (f.overdue || f.dueToday || f.dueThisWeek || f.noDueDate) n++;
    if (f.assignedToId || f.labelId) n++;
    return n;
  }

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

  dueInfo(dueDate: string | null | undefined): { label: string; cls: string } {
    if (!dueDate) return { label: 'No due date', cls: 'due-none' };
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(due);
    d.setHours(0, 0, 0, 0);
    const days = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { label: `${-days}d overdue`, cls: 'due-over' };
    if (days === 0) return { label: 'Due today', cls: 'due-today' };
    if (days === 1) return { label: 'Due tomorrow', cls: 'due-soon' };
    if (days <= 7) return { label: `Due in ${days}d`, cls: 'due-soon' };
    return { label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), cls: 'due-ok' };
  }

  applyFilters(): void {
    if ((this.f.search ?? '').length > 200) {
      this.toast.error('Search must be 200 characters or fewer.');
      return;
    }
    this.store.setFilters({ ...this.f, projectId: this.projectId, page: 1 });
    this.load();
  }

  clear(): void {
    this.store.resetFilters(this.projectId);
    this.f = { ...this.store.filters() };
    this.load();
  }

  gotoPage(page: number): void {
    this.store.setFilters({ page });
    this.f.page = page;
    this.load();
  }

  changeSize(size: number): void {
    const clamped = Math.min(100, Math.max(1, size));
    this.store.setFilters({ pageSize: clamped, page: 1 });
    this.f.pageSize = clamped;
    this.f.page = 1;
    this.load();
  }

  load(): void {
    this.store.setLoading(true);
    const params = { ...this.store.filters(), projectId: this.projectId };
    this.api.list(params).subscribe({
      next: (r) => this.store.setResult(r),
      error: (err) => {
        this.store.setError(err?.normalized?.message ?? 'Failed to load tasks.');
        this.toast.error(err?.normalized?.message ?? 'Failed to load tasks.');
      },
    });
  }
}
