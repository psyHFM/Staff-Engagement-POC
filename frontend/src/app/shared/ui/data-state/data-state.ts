import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';

/**
 * One canonical loading / empty / error+retry set (frontend-redesign §2.6),
 * applied to every data list and dashboard card.
 *
 * <p>Renders exactly one of: a spinner (in {@code --accent}) while loading, a
 * muted empty state when there is nothing to show, or a {@code --danger}-tinted
 * error card with a Retry button that emits {@link retry}. When none of these
 * apply the component renders nothing so the parent can show its content.
 */
@Component({
  selector: 'app-data-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="ds ds--loading" role="status" aria-live="polite">
        <i class="pi pi-spinner ds__spinner" aria-hidden="true"></i>
        <span class="ds__text">{{ loadingText() }}</span>
      </div>
    } @else if (error()) {
      <div class="ds ds--error" role="alert">
        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
        <span class="ds__text">{{ errorText() }}</span>
        <button type="button" class="ui-btn ui-btn--secondary ds__retry" (click)="retry.emit()">
          Retry
        </button>
      </div>
    } @else if (empty()) {
      <div class="ds ds--empty">
        <span class="ds__text">{{ emptyText() }}</span>
      </div>
    }
  `,
  styleUrl: './data-state.scss'
})
export class DataState {
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);

  readonly loadingText = input('Loading…');
  readonly emptyText = input('Nothing to show yet.');
  readonly errorText = input('Something went wrong.');

  /** Emitted when the user clicks Retry in the error state. */
  @Output() readonly retry = new EventEmitter<void>();
}
