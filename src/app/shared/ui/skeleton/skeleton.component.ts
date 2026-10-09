import { Component, input } from '@angular/core';

export type SkeletonKind = 'card' | 'row' | 'board' | 'lines';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    @switch (kind()) {
      @case ('card') {
        <div class="sk-card card" aria-hidden="true">
          <div class="skeleton sk-title"></div>
          <div class="skeleton sk-line"></div>
          <div class="skeleton sk-line short"></div>
        </div>
      }
      @case ('row') {
        <div class="sk-row" aria-hidden="true">
          <div class="skeleton sk-pill"></div>
          <div class="skeleton sk-line flex"></div>
          <div class="skeleton sk-meta"></div>
        </div>
      }
      @case ('board') {
        <div class="sk-col" aria-hidden="true">
          <div class="skeleton sk-col-head"></div>
          <div class="skeleton sk-task"></div>
          <div class="skeleton sk-task"></div>
          <div class="skeleton sk-task short"></div>
        </div>
      }
      @default {
        <div class="sk-lines" aria-hidden="true">
          <div class="skeleton sk-line"></div>
          <div class="skeleton sk-line"></div>
          <div class="skeleton sk-line short"></div>
        </div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .sk-card {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
      }
      .sk-title {
        height: 1.1rem;
        width: 55%;
      }
      .sk-line {
        height: 0.8rem;
      }
      .sk-line.short {
        width: 40%;
      }
      .sk-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--border);
      }
      .sk-pill {
        height: 1.25rem;
        width: 4.5rem;
        border-radius: 9999px;
      }
      .sk-line.flex {
        flex: 1;
      }
      .sk-meta {
        height: 0.8rem;
        width: 7rem;
      }
      .sk-col {
        border-radius: var(--radius-lg);
        border: 1px solid var(--border);
        background: var(--surface-2);
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-height: 16rem;
      }
      .sk-col-head {
        height: 1rem;
        width: 45%;
      }
      .sk-task {
        height: 4.5rem;
        border-radius: var(--radius-md);
      }
      .sk-task.short {
        height: 3.25rem;
        width: 80%;
      }
      .sk-lines {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
    `,
  ],
})
export class SkeletonComponent {
  readonly kind = input<SkeletonKind>('lines');
}
