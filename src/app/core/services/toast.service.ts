import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

let nextId = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  private push(kind: Toast['kind'], message: string): void {
    // Dedupe: an outage can fail many requests at once (e.g. every guard
    // run) — don't stack identical toasts, show one until it dismisses.
    if (this.toasts().some((t) => t.kind === kind && t.message === message)) {
      return;
    }
    const id = nextId++;
    this.toasts.update((t) => [...t, { id, kind, message }]);
    window.setTimeout(() => this.dismiss(id), 5000);
  }

  success(message: string): void {
    this.push('success', message);
  }
  error(message: string): void {
    this.push('error', message);
  }
  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
