import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InteractionStateService } from '../interaction-state.service';
import { InteractionSummary, InteractionType, INTERACTION_TYPES } from '../interaction.types';

/**
 * Modal form for editing an existing interaction's mutable fields (ATSE1-28).
 *
 * <p>Only {@code type} and {@code note} are editable. Subject, facilitator,
 * and createdAt are immutable on the server (the audit trail records what
 * happened, not the latest edit). The component receives the existing
 * {@link InteractionSummary} and forwards the edit to
 * {@link InteractionStateService#updateInteraction}.
 *
 * <p>Open/close is owned by the parent (interaction-page) via the
 * {@link #editing} input. The component never sets it directly — on a
 * successful update it emits {@link saved} so the parent can close the
 * modal and refresh history (which the state service already does).
 */
@Component({
  selector: 'app-edit-interaction',
  imports: [FormsModule],
  templateUrl: './edit-interaction.html',
  styleUrl: './edit-interaction.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditInteraction implements OnChanges {
  @Input() editing: InteractionSummary | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<InteractionSummary>();

  protected readonly state = inject(InteractionStateService);
  protected readonly types = INTERACTION_TYPES;

  protected type: InteractionType = 'check-in';
  protected note = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editing'] && this.editing) {
      this.type = this.editing.type;
      this.note = this.editing.note;
    }
  }

  protected get isOpen(): boolean {
    return this.editing !== null;
  }

  protected submit(): void {
    if (!this.editing) {
      return;
    }
    this.state.updateInteraction(this.editing.id, this.type, this.note).subscribe({
      next: (updated) => this.saved.emit(updated),
      error: () => {
        // Error already surfaced via state.error(); keep the modal open
        // so the user can correct and retry.
      }
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  /**
   * Close only when the click landed on the overlay itself, not on a
   * descendant. This avoids the (lint-flagged) pattern of attaching a
   * click handler to the inner panel purely to stop propagation.
   */
  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
