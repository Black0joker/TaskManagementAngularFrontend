import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectsService } from '../../../core/services/projects.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProjectsStore } from '../../../core/stores/projects.store';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './project-form.component.html',
  styleUrl: './project-form.component.css',
})
export class ProjectFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();
  mode: 'create' | 'edit' = 'create';
  projectId: string | null = null;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProjectsService);
  private readonly store = inject(ProjectsStore);
  private readonly toast = inject(ToastService);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
  });

  initForEdit(id: string, name: string, description: string | null): void {
    this.mode = 'edit';
    this.projectId = id;
    this.form.setValue({ name, description: description ?? '' });
  }

  submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const raw = this.form.getRawValue();
    const body = { name: raw.name.trim(), description: raw.description?.trim() ? raw.description : null };
    if (this.mode === 'edit' && this.projectId) {
      const id = this.projectId;
      this.api.update(id, { id, ...body }).subscribe({
        next: (p) => {
          this.busy.set(false);
          this.store.upsert(p);
          this.toast.success('Project updated.');
          this.saved.emit();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.normalized?.message ?? 'Update failed.');
        },
      });
    } else {
      this.api.create(body).subscribe({
        next: (p) => {
          this.busy.set(false);
          this.store.upsert(p);
          this.toast.success('Project created.');
          this.saved.emit();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.normalized?.message ?? 'Create failed.');
        },
      });
    }
  }
}
