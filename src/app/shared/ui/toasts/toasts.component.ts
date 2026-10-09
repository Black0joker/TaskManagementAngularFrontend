import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { AppIconComponent, type IconName } from '../icon/app-icon.component';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './toasts.component.html',
  styleUrl: './toasts.component.css',
})
export class ToastsComponent {
  readonly toasts = inject(ToastService);

  iconFor(kind: 'success' | 'error' | 'info'): IconName {
    return kind === 'error' ? 'error' : kind === 'success' ? 'checkAll' : 'clock';
  }
}
