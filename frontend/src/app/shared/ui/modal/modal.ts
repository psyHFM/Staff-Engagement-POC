import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  effect,
  inject,
  input
} from '@angular/core';

/**
 * Reusable modal shell (frontend-redesign §2.5).
 *
 * <p>Centered card with {@code --shadow-md}, {@code role="dialog"} +
 * {@code aria-modal}, a focus trap, and Escape-to-close. Body content is
 * projected; the header shows {@link title} and a labelled close button. The
 * host controls visibility via {@link open} and reacts to {@link closed}
 * (emitted on Escape, backdrop click, or the close button).
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="modal__backdrop" (click)="onBackdrop($event)">
        <div
          class="modal__dialog"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
        >
          <div class="modal__header">
            <h2 class="page-title modal__title">{{ title() }}</h2>
            <button
              type="button"
              class="ui-btn ui-btn--ghost modal__close"
              aria-label="Close dialog"
              (click)="closed.emit()"
            >
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>
          <div class="modal__body">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './modal.scss'
})
export class Modal {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly open = input(false);
  readonly title = input('');

  /** Emitted whenever the user requests a close (Escape / backdrop / button). */
  @Output() readonly closed = new EventEmitter<void>();

  constructor() {
    // Move focus into the dialog when it opens so the trap has an anchor.
    effect(() => {
      if (this.open()) {
        queueMicrotask(() => this.focusFirst());
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }
    if (event.key === 'Tab') {
      this.trapTab(event);
    }
  }

  protected onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal__backdrop')) {
      this.closed.emit();
    }
  }

  private focusable(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  private focusFirst(): void {
    this.focusable()[0]?.focus();
  }

  private trapTab(event: KeyboardEvent): void {
    const items = this.focusable();
    if (items.length === 0) {
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = this.host.nativeElement.ownerDocument.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
