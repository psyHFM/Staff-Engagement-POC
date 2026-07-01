import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from './toast.service';

/**
 * Toast notification container component (ATSE1-52).
 *
 * Displays active toasts from ToastService in a fixed overlay.
 * Each toast auto-dismisses after its duration.
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of toastService.toasts(); track toast) {
        <div class="toast toast-{{ toast.type }}" role="alert">
          <i class="pi {{ toastIcon(toast.type) }}"></i>
          <span class="toast-message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast-dismiss"
            (click)="toastService.dismiss(toast)"
            aria-label="Dismiss notification">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: calc(var(--space) * 2);
      right: calc(var(--space) * 2);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: var(--space);
    }

    .toast {
      display: flex;
      align-items: center;
      gap: calc(var(--space) * 1.5);
      padding: calc(var(--space) * 1.5) calc(var(--space) * 2);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-md);
      min-width: 280px;
      max-width: 400px;
      font-size: 14px;
      animation: slide-in var(--ease);

      &.toast-success {
        background: var(--success-soft);
        color: var(--success);
        border: 1px solid var(--success);
      }

      &.toast-error {
        background: var(--danger-soft);
        color: var(--danger);
        border: 1px solid var(--danger);
      }

      &.toast-warning {
        background: var(--warn-bg);
        color: var(--warn-fg);
        border: 1px solid var(--warn-fg);
      }

      &.toast-info {
        background: var(--info-bg);
        color: var(--info-fg);
        border: 1px solid var(--info-fg);
      }
    }

    .toast-message {
      flex: 1;
    }

    .toast-dismiss {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: calc(var(--space) * 0.5);
      color: inherit;
      opacity: 0.7;
      border-radius: var(--radius-sm);

      &:hover {
        opacity: 1;
        background: var(--surface-2);
      }
    }

    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  protected toastIcon(type: ToastMessage['type']): string {
    switch (type) {
      case 'success': return 'pi-check-circle';
      case 'error': return 'pi-exclamation-triangle';
      case 'warning': return 'pi-exclamation-circle';
      case 'info': return 'pi-info-circle';
    }
  }
}
