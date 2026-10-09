import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { forkJoin } from 'rxjs';
import type { ProjectTaskSummary, TaskItemPriority, TaskItemStatus } from '../../../core/models/api.models';
import { TASK_STATUSES } from '../../../core/models/api.models';
import { ProjectsService } from '../../../core/services/projects.service';
import { TasksService } from '../../../core/services/tasks.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProjectRoleStore } from '../../../core/stores/project-role.store';
import { canTransition } from '../../../core/utils/kanban-guards';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { AppIconComponent } from '../../../shared/ui/icon/app-icon.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { TaskFormComponent } from '../task-form/task-form.component';

const COLUMNS: TaskItemStatus[] = [...TASK_STATUSES];

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DragDropModule, EmptyStateComponent, TaskFormComponent, AppIconComponent, SkeletonComponent],
  templateUrl: './task-board.component.html',
  styleUrl: './task-board.component.css',
})
export class TaskBoardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(TasksService);
  private readonly projects = inject(ProjectsService);
  private readonly toast = inject(ToastService);
  readonly roleStore = inject(ProjectRoleStore);

  readonly columns = COLUMNS;
  readonly summaries = signal<ProjectTaskSummary[]>([]);
  readonly loading = signal(true);
  readonly projectName = signal('');
  readonly showCreate = signal(false);

  private readonly grouped = computed(() => {
    const map = new Map<TaskItemStatus, ProjectTaskSummary[]>();
    for (const c of COLUMNS) map.set(c, []);
    for (const t of this.summaries()) map.get(t.status)?.push(t);
    return map;
  });

  byStatus(status: TaskItemStatus) {
    return computed(() => this.grouped().get(status) ?? []);
  }

  get projectId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    forkJoin({
      p: this.projects.get(this.projectId),
      tasks: this.projects.listTasks(this.projectId),
    }).subscribe({
      next: ({ p, tasks }) => {
        this.projectName.set(p.name);
        this.summaries.set(tasks);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.normalized?.message ?? 'Failed to load board.');
      },
    });
  }

  blockedReason(_t: ProjectTaskSummary, _col: TaskItemStatus): string | null {
    // Per-card reason is computed at drop time (needs source status); column hint stays static.
    return null;
  }

  isLocked(t: ProjectTaskSummary): boolean {
    return t.status === 'Done' && !this.roleStore.isOwnerOrAdmin();
  }

  priorityClass(p: TaskItemPriority): string {
    return p === 'Critical' ? 'pri-critical' : p === 'High' ? 'pri-high' : p === 'Medium' ? 'pri-medium' : 'pri-low';
  }

  dueInfo(dueDate: string | null): { label: string; cls: string } {
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

  drop(event: CdkDragDrop<ProjectTaskSummary[]>, to: TaskItemStatus): void {
    const task = event.item.data as ProjectTaskSummary;
    if (!task || task.status === to) {
      if (event.previousContainer !== event.container) {
        moveItemInArray(event.container.data, event.currentIndex, event.currentIndex);
      }
      return;
    }
    // Optimistic guard first (guide §4).
    const check = canTransition(task.status, to, this.roleStore.myRole());
    if (!check.allowed) {
      this.toast.error(`Cannot move ${task.status} → ${to}. ${check.reason}.`);
      return;
    }
    if (to === 'InProgress' && !task.assignedToId) {
      this.toast.error('Unassigned tasks cannot enter InProgress — assign someone first.');
      return;
    }
    if (task.status === 'Done') {
      this.toast.info('Done tasks are immutable except backward moves by Owner/Admin.');
      if (!this.roleStore.isOwnerOrAdmin()) return;
    }
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
    this.summaries.update((all) => all.map((t) => (t.id === task.id ? { ...t, status: to } : t)));
    this.api.patchStatus(task.id, { status: to }).subscribe({
      next: (updated) => {
        this.summaries.update((all) =>
          all.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t)),
        );
        this.toast.success(`Moved to ${to}.`);
      },
      error: (err) => {
        this.reload(); // roll back optimistic move
        this.toast.error(err?.normalized?.message ?? 'Status change rejected.');
      },
    });
  }
}
