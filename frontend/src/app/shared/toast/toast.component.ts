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
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 280px;
      max-width: 400px;
      animation: slide-in 0.2s ease-out;

      &.toast-success {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
      }

      &.toast-error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fca5a5;
      }

      &.toast-warning {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fcd34d;
      }

      &.toast-info {
        background: #dbeafe;
        color: #1e40af;
        border: 1px solid #93c5fd;
      }
    }

    .toast-message {
      flex: 1;
      font-size: 0.875rem;
    }

    .toast-dismiss {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      color: inherit;
      opacity: 0.7;
      border-radius: 0.25rem;

      &:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
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
