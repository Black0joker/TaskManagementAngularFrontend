import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ProjectLabelSummary } from '../../core/models/api.models';
import { LabelsService } from '../../core/services/labels.service';
import { ProjectsService } from '../../core/services/projects.service';
import { ToastService } from '../../core/services/toast.service';
import { hexColorValidator } from '../../core/utils/validators';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { AppIconComponent } from '../../shared/ui/icon/app-icon.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-project-labels',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, EmptyStateComponent, AppIconComponent, SkeletonComponent],
  templateUrl: './project-labels.component.html',
  styleUrl: './project-labels.component.css',
})
export class ProjectLabelsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly projects = inject(ProjectsService);
  private readonly labelsApi = inject(LabelsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly labels = signal<ProjectLabelSummary[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    color: ['#4F46E5', [Validators.required, hexColorValidator()]],
  });
  readonly editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    color: ['', [Validators.required, hexColorValidator()]],
  });

  get projectId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.projects.listLabels(this.projectId).subscribe({
      next: (list) => {
        this.labels.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.normalized?.message ?? 'Failed to load labels.');
      },
    });
  }

  create(): void {
    if (this.createForm.invalid || this.busy()) return;
    const raw = this.createForm.getRawValue();
    this.busy.set(true);
    this.projects.createLabel(this.projectId, { name: raw.name.trim(), color: raw.color.toUpperCase() }).subscribe({
      next: (l) => {
        this.busy.set(false);
        this.createForm.reset({ name: '', color: '#4F46E5' });
        this.labels.update((all) => [l, ...all]);
        this.toast.success('Label created.');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err?.normalized?.message ?? 'Create failed.');
      },
    });
  }

  startEdit(l: ProjectLabelSummary): void {
    this.editingId.set(l.id);
    this.editForm.setValue({ name: l.name, color: l.color.toUpperCase() });
  }

  save(): void {
    const id = this.editingId();
    if (!id || this.editForm.invalid) return;
    const raw = this.editForm.getRawValue();
    this.labelsApi.update(id, { name: raw.name.trim(), color: raw.color.toUpperCase() }).subscribe({
      next: (updated) => {
        this.editingId.set(null);
        this.labels.update((all) => all.map((x) => (x.id === updated.id ? updated : x)));
        this.toast.success('Label updated.');
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Update failed.'),
    });
  }

  remove(id: string): void {
    this.labelsApi.delete(id).subscribe({
      next: () => {
        this.labels.update((all) => all.filter((x) => x.id !== id));
        this.toast.success('Label deleted.');
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Delete failed.'),
    });
  }
}
