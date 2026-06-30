import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

/**
 * Simple toast notification service (ATSE1-52).
 *
 * Shows brief messages to the user for actions like logout, save, etc.
 * Toasts are auto-dismissed after the specified duration (default 3000ms).
 *
 * Usage:
 * ```typescript
 * toastService.show('You have been signed out', { type: 'success' });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<ToastMessage[]>([]);

  readonly toasts = this._toasts.asReadonly();

  show(message: string, options: { type: ToastMessage['type']; duration?: number } = { type: 'info' }): void {
    const toast: ToastMessage = {
      message,
      type: options.type,
      duration: options.duration ?? 3000
    };

    this._toasts.update(toasts => [...toasts, toast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      this._toasts.update(toasts => toasts.filter(t => t !== toast));
    }, toast.duration);
  }

  dismiss(toast: ToastMessage): void {
    this._toasts.update(toasts => toasts.filter(t => t !== toast));
  }

  clear(): void {
    this._toasts.set([]);
  }
}
