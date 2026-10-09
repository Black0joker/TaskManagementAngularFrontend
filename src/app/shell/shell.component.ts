import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthFacade } from '../features/auth/auth.facade';
import { ThemeService } from '../core/services/theme.service';
import { AuthStore } from '../core/stores/auth.store';
import { AvatarComponent } from '../shared/ui/avatar/avatar.component';
import { AppIconComponent } from '../shared/ui/icon/app-icon.component';
import { ToastsComponent } from '../shared/ui/toasts/toasts.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastsComponent, AppIconComponent, AvatarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  readonly auth = inject(AuthStore);
  readonly theme = inject(ThemeService);
  private readonly facade = inject(AuthFacade);
  private readonly router = inject(Router);
  readonly navOpen = signal(false);

  closeNav(): void {
    this.navOpen.set(false);
  }

  logout(): void {
    this.facade.logout();
    this.closeNav();
    void this.router.navigate(['/login']);
  }
}
