import { Component, input } from '@angular/core';
import { AppIconComponent } from '../../../shared/ui/icon/app-icon.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css',
})
export class AuthLayoutComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
}
