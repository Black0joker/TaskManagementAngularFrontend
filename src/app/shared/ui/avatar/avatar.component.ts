import { Component, computed, input } from '@angular/core';

const PALETTE = [
  '#4f46e5', '#0ea5e9', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#c026d3',
];

export function hueFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 997;
  return PALETTE[h % PALETTE.length];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `<span class="avatar" [style.background]="color()" [style.width.px]="size()" [style.height.px]="size()" [style.fontSize.px]="size() * 0.38" [title]="name()">{{ text() }}</span>`,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-shrink: 0;
      }
    `,
  ],
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input<number>(28);
  readonly text = computed(() => initialsOf(this.name()));
  readonly color = computed(() => hueFor(this.name()));
}
