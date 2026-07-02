import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';

import { InteractionStateService } from '../interaction-state.service';
import { Modal } from '../../../shared/ui/modal/modal';
import { Badge } from '../../../shared/ui/badge/badge';

/**
 * Detail modal for displaying full interaction details.
 *
 * <p>Shows the complete interaction details including full notes when a user
 * clicks on an interaction row in the list. Mirrors the task details modal UX.
 */
@Component({
  selector: 'app-interaction-detail-modal',
  standalone: true,
  imports: [Modal, Badge, DatePipe],
  templateUrl: './interaction-detail-modal.html',
  styleUrl: './interaction-detail-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractionDetailModal {
  private readonly interactionState = inject(InteractionStateService);

  readonly interaction = this.interactionState.selectedInteractionForModal;
  readonly modalOpen = computed(() => this.interactionState.selectedInteractionForModal() !== null);

  protected closeModal(): void {
    this.interactionState.closeInteractionDetail();
  }
}
