import { Component, input, output } from '@angular/core';
import { AppIconComponent, type IconName } from '../icon/app-icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly hint = input<string>('');
  readonly icon = input<IconName>('inbox');
  readonly actionLabel = input<string>('');
  readonly action = output<void>();
}
