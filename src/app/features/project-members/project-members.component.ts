import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgSelectComponent } from '@ng-select/ng-select';
import type { ProjectMemberResponse, ProjectMemberRole } from '../../core/models/api.models';
import { PROJECT_ROLES } from '../../core/models/api.models';
import { ProjectMembersService } from '../../core/services/project-members.service';
import { ToastService } from '../../core/services/toast.service';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { AppIconComponent } from '../../shared/ui/icon/app-icon.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-project-members',
  standalone: true,
  imports: [RouterLink, FormsModule, EmptyStateComponent, AppIconComponent, AvatarComponent, SkeletonComponent, NgSelectComponent],
  templateUrl: './project-members.component.html',
  styleUrl: './project-members.component.css',
})
export class ProjectMembersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ProjectMembersService);
  private readonly toast = inject(ToastService);

  readonly roles = PROJECT_ROLES;
  readonly members = signal<ProjectMemberResponse[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  newUserId = '';
  newRole: ProjectMemberRole = 'Member';

  get projectId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.list(this.projectId).subscribe({
      next: (list) => {
        this.members.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.normalized?.message ?? 'Failed to load members.');
      },
    });
  }

  add(): void {
    const userId = this.newUserId.trim();
    if (!userId || this.busy()) return;
    this.busy.set(true);
    this.api.add(this.projectId, { userId, role: this.newRole }).subscribe({
      next: (m) => {
        this.busy.set(false);
        this.newUserId = '';
        this.members.update((all) => [m, ...all.filter((x) => x.userId !== m.userId)]);
        this.toast.success('Member added.');
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err?.normalized?.message ?? 'Add failed.');
      },
    });
  }

  changeRole(m: ProjectMemberResponse, role: ProjectMemberRole): void {
    this.api.updateRole(this.projectId, m.userId, { role }).subscribe({
      next: (updated) => {
        this.members.update((all) => all.map((x) => (x.userId === updated.userId ? updated : x)));
        this.toast.success('Role updated.');
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Role update failed.'),
    });
  }

  remove(m: ProjectMemberResponse): void {
    this.api.remove(this.projectId, m.userId).subscribe({
      next: () => {
        this.members.update((all) => all.filter((x) => x.userId !== m.userId));
        this.toast.success('Member removed.');
      },
      error: (err) => this.toast.error(err?.normalized?.message ?? 'Remove failed.'),
    });
  }
}
