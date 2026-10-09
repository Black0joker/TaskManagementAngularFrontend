import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { DatePickerComponent } from '../../../shared/ui/date-picker/date-picker.component';
import type { UpdateTaskRequest } from '../../../core/models/api-requests';
import { primaryMessage } from '../../../core/models/problem-details';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskItemPriority,
  type TaskItemStatus,
  type TaskResponse,
} from '../../../core/models/api.models';
import { TasksService } from '../../../core/services/tasks.service';
import { ToastService } from '../../../core/services/toast.service';
import { TasksStore } from '../../../core/stores/tasks.store';
import { dueDateNotPastValidator } from '../../../core/utils/validators';
import { fromDateInputValue, toDateInputValue, toWireDate } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgSelectComponent, DatePickerComponent],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.css',
})
export class TaskFormComponent {
  readonly projectId = input.required<string>();
  readonly initial = input<TaskResponse | null>(null);
  readonly saved = output<TaskResponse>();
  readonly cancelled = output<void>();

  readonly statuses = TASK_STATUSES;
  readonly priorities = TASK_PRIORITIES;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TasksService);
  private readonly store = inject(TasksStore);
  private readonly toast = inject(ToastService);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
    status: ['Todo' as TaskItemStatus, [Validators.required]],
    priority: ['Medium' as TaskItemPriority, [Validators.required]],
    dueDate: ['', [dueDateNotPastValidator()]],
    assignedToId: [''],
  });

  constructor() {
    // Prime from initial when editing (inputs resolved before ctor in practice via ngOnInit timing).
    queueMicrotask(() => {
      const t = this.initial();
      if (t) {
        this.form.patchValue({
          title: t.title,
          description: t.description ?? '',
          status: t.status as never,
          priority: t.priority as never,
          dueDate: toDateInputValue(t.dueDate),
          assignedToId: t.assignedTo?.id ?? '',
        });
      }
    });
    this.form.controls.status.valueChanges.subscribe(() => this.syncDoneDueDate());
  }

  isDoneLikeSelected(): boolean {
    const s = this.form.controls.status.value;
    return s === 'Done' || s === 'Cancelled';
  }

  needsAssignee(): boolean {
    return this.form.controls.status.value === 'InProgress' && !this.form.controls.assignedToId.value?.trim();
  }

  private syncDoneDueDate(): void {
    // UX hint only — backend forbids due dates for Done/Cancelled; user must clear.
    if (this.isDoneLikeSelected()) {
      this.form.controls.dueDate.markAsTouched();
    }
  }

  submit(): void {
    if (this.form.invalid || this.busy()) return;
    if (this.needsAssignee()) {
      this.error.set('Unassigned tasks cannot enter InProgress — pick an assignee.');
      return;
    }
    const raw = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    const due = raw.dueDate ? fromDateInputValue(raw.dueDate) : null;
    const assignee = raw.assignedToId?.trim() ? raw.assignedToId.trim() : null;
    const existing = this.initial();
    if (existing) {
      const body: UpdateTaskRequest = {
        title: raw.title.trim(),
        description: raw.description?.trim() ? raw.description : null,
        status: raw.status as never,
        priority: raw.priority as never,
        assignedToId: assignee,
        dueDate: due,
      };
      this.api.fullUpdate(existing.id, body).subscribe({
        next: (t) => {
          this.busy.set(false);
          this.store.patchTask(t);
          this.toast.success('Task updated.');
          this.saved.emit(t);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(primaryMessage(err?.normalized) ?? 'Update failed.');
        },
      });
    } else {
      this.api
        .create({
          projectId: this.projectId(),
          title: raw.title.trim(),
          description: raw.description?.trim() ? raw.description : null,
          status: raw.status as never,
          priority: raw.priority as never,
          assignedToId: assignee,
          dueDate: toWireDate(due),
        })
        .subscribe({
          next: (t) => {
            this.busy.set(false);
            this.toast.success('Task created.');
            this.saved.emit(t);
          },
        error: (err) => {
          this.busy.set(false);
          this.error.set(primaryMessage(err?.normalized) ?? 'Create failed.');
        },
        });
    }
  }
}
