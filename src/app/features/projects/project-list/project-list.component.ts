import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ProjectsService } from '../../../core/services/projects.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthStore } from '../../../core/stores/auth.store';
import { ProjectsStore } from '../../../core/stores/projects.store';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { AppIconComponent } from '../../../shared/ui/icon/app-icon.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ProjectFormComponent } from '../project-form/project-form.component';

type SortKey = 'updated' | 'name';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [RouterLink, FormsModule, EmptyStateComponent, ProjectFormComponent, AppIconComponent, AvatarComponent, SkeletonComponent, NgSelectComponent],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.css',
})
export class ProjectListComponent {
  readonly store = inject(ProjectsStore);
  readonly auth = inject(AuthStore);
  private readonly api = inject(ProjectsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  q = '';
  sort: SortKey = 'updated';
  readonly sortOptions = [
    { value: 'updated' as SortKey, label: 'Recently updated' },
    { value: 'name' as SortKey, label: 'Name A–Z' },
  ];
  readonly showCreate = signal(false);

  readonly filtered = computed(() => {
    const s = this.store.search().toLowerCase();
    const all = this.store.projects();
    const matched = !s
      ? [...all]
      : all.filter(
          (p) => p.name.toLowerCase().includes(s) || (p.description ?? '').toLowerCase().includes(s),
        );
    matched.sort((a, b) =>
      this.sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt),
    );
    return matched;
  });

  constructor() {
    this.q = this.store.search();
    this.reload();
  }

  clearSearch(): void {
    this.q = '';
    this.store.setSearch('');
  }

  reload(): void {
    this.store.setLoading(true);
    this.api.list().subscribe({
      next: (list) => this.store.setProjects(list),
      error: (err) => this.store.setError(err?.normalized?.message ?? 'Failed to load projects.'),
    });
  }

  async remove(id: string, name: string): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete project',
      message: `Delete "${name}"? This needs Project.Delete permission.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.api.delete(id).subscribe({
      next: () => {
        this.store.remove(id);
        this.toast.success('Project deleted.');
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Delete failed.'),
    });
  }
}
