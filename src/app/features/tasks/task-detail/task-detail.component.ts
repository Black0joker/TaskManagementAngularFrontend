import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgSelectComponent } from '@ng-select/ng-select';
import { forkJoin } from 'rxjs';
import type { CommentResponse, PagedResult, ProjectLabelSummary, TaskDetailsResponse } from '../../../core/models/api.models';
import { primaryMessage } from '../../../core/models/problem-details';
import { PROJECT_ROLES, TASK_PRIORITIES, TASK_STATUSES } from '../../../core/models/api.models';
import { CommentsService } from '../../../core/services/comments.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LabelsService } from '../../../core/services/labels.service';
import { ProjectsService } from '../../../core/services/projects.service';
import { TasksService } from '../../../core/services/tasks.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthStore } from '../../../core/stores/auth.store';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { DatePickerComponent } from '../../../shared/ui/date-picker/date-picker.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { AppIconComponent } from '../../../shared/ui/icon/app-icon.component';
import { PagerComponent } from '../../../shared/ui/pager/pager.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { fromDateInputValue, toDateInputValue } from '../../../core/utils/date-utils';
import { TaskFormComponent } from '../task-form/task-form.component';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, PagerComponent, TaskFormComponent, AppIconComponent, AvatarComponent, EmptyStateComponent, SkeletonComponent, NgSelectComponent, DatePickerComponent],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css',
})
export class TaskDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(TasksService);
  private readonly projects = inject(ProjectsService);
  private readonly commentsApi = inject(CommentsService);
  private readonly labelsApi = inject(LabelsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStore);

  readonly statuses = TASK_STATUSES;
  readonly priorities = TASK_PRIORITIES;
  readonly roles = PROJECT_ROLES;

  readonly task = signal<TaskDetailsResponse | null>(null);
  readonly labels = signal<ProjectLabelSummary[]>([]);
  readonly comments = signal<PagedResult<CommentResponse>>({
    items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false,
  });
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly editing = signal(false);
  readonly posting = signal(false);

  draft = '';
  readonly editingCommentId = signal<string | null>(null);
  editDraft = '';
  quick = { status: 'Todo', priority: 'Medium', assignee: '', dueDate: '' };

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

  relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
    return { label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), cls: 'due-ok' };
  }

  get id(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.getDetails(this.id).subscribe({
      next: (t) => {
        this.task.set(t);
        this.quick = {
          status: t.status, priority: t.priority,
          assignee: t.assignedTo?.id ?? '', dueDate: toDateInputValue(t.dueDate),
        };
        this.loading.set(false);
        forkJoin({
          labels: this.projects.listLabels(t.projectId),
          comments: this.api.listComments(t.id, { page: this.comments().page, pageSize: this.comments().pageSize }),
        }).subscribe({
          next: ({ labels, comments }) => {
            this.labels.set(labels);
            this.comments.set(comments);
          },
          error: (err) => this.toast.error(err?.normalized?.message ?? 'Failed to load extras.'),
        });
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404) this.notFound.set(true);
        else this.toast.error(err?.normalized?.message ?? 'Failed to load task.');
      },
    });
  }

  onSaved(t: { id: string }): void {
    this.editing.set(false);
    this.reload();
  }

  doPatch(kind: 'status' | 'priority' | 'assignee' | 'dueDate'): void {
    const t = this.task();
    if (!t) return;
    const obs =
      kind === 'status'
        ? this.api.patchStatus(t.id, { status: this.quick.status as never })
        : kind === 'priority'
          ? this.api.patchPriority(t.id, { priority: this.quick.priority as never })
          : kind === 'assignee'
            ? this.api.patchAssignee(t.id, { userId: this.quick.assignee.trim() ? this.quick.assignee.trim() : null })
            : this.api.patchDueDate(t.id, { dueDate: this.quick.dueDate ? fromDateInputValue(this.quick.dueDate) : null });
    obs.subscribe({
      next: () => {
        this.toast.success('Task updated.');
        this.reload();
      },
      error: (err) => this.toast.error(primaryMessage(err?.normalized) ?? 'Patch rejected.'),
    });
  }

  addLabel(labelId: string): void {
    const t = this.task();
    if (!t) return;
    this.api.addLabel(t.id, labelId).subscribe({
      next: () => {
        this.toast.success('Label added.');
        this.reload();
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Add label failed.'),
    });
  }

  removeLabel(labelId: string): void {
    const t = this.task();
    if (!t) return;
    this.api.removeLabel(t.id, labelId).subscribe({
      next: () => {
        this.toast.success('Label removed.');
        this.reload();
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Remove label failed.'),
    });
  }

  gotoCommentPage(page: number): void {
    const t = this.task();
    if (!t) return;
    this.api.listComments(t.id, { page, pageSize: this.comments().pageSize }).subscribe({
      next: (c) => this.comments.set(c),
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Failed to load comments.'),
    });
  }

  commentSize(size: number): void {
    const t = this.task();
    if (!t) return;
    this.api.listComments(t.id, { page: 1, pageSize: Math.min(100, Math.max(1, size)) }).subscribe({
      next: (c) => this.comments.set(c),
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Failed to load comments.'),
    });
  }

  addComment(): void {
    const t = this.task();
    const content = this.draft.trim();
    if (!t || !content) return;
    this.posting.set(true);
    this.api.createComment(t.id, { content }).subscribe({
      next: () => {
        this.posting.set(false);
        this.draft = '';
        this.toast.success('Comment posted.');
        this.gotoCommentPage(1);
      },
      error: (err) => {
        this.posting.set(false);
        this.toast.error(err?.normalized?.message ?? 'Post failed.');
      },
    });
  }

  startEdit(c: CommentResponse): void {
    this.editingCommentId.set(c.id);
    this.editDraft = c.content;
  }

  saveComment(id: string): void {
    const content = this.editDraft.trim();
    if (!content) return;
    this.commentsApi.update(id, { content }).subscribe({
      next: () => {
        this.editingCommentId.set(null);
        this.toast.success('Comment updated.');
        this.gotoCommentPage(this.comments().page);
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Update failed.'),
    });
  }

  deleteComment(id: string): void {
    this.commentsApi.delete(id).subscribe({
      next: () => {
        this.toast.success('Comment deleted.');
        this.gotoCommentPage(this.comments().page);
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Delete failed.'),
    });
  }

  async remove(): Promise<void> {
    const t = this.task();
    if (!t) return;
    const hasComments = this.comments().totalCount > 0;
    const ok = await this.confirm.confirm({
      title: 'Delete task',
      message: hasComments
        ? 'This task has comments — the API returns 409 until comments are deleted. Delete task anyway? (You must delete comments first.)'
        : `Delete "${t.title}"?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.api.delete(t.id).subscribe({
      next: () => {
        this.toast.success('Task deleted.');
        void this.router.navigate(['/projects', t.projectId, 'list']);
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Delete failed.'),
    });
  }
}
