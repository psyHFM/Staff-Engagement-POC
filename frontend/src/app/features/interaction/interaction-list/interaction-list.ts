import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { InteractionSummary, Paged } from '../interaction.types';

/** Emitted when the user requests a different page of results. */
export interface PageRequest {
  readonly offset: number;
  readonly limit: number;
}

/**
 * Renders the paginated interaction history for a single employee.
 *
 * <p>Pure presentation component: receives the {@link Paged} history and loading
 * flag, and emits page-change requests to the parent / state service.
 */
@Component({
  selector: 'app-interaction-list',
  templateUrl: './interaction-list.html',
  styleUrl: './interaction-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractionList {
  @Input({ required: true }) history: Paged<InteractionSummary> | null = null;
  @Input({ required: true }) loading = false;
  @Output() pageRequested = new EventEmitter<PageRequest>();

  protected readonly limit = 20;

  protected get currentOffset(): number {
    return this.history?.offset ?? 0;
  }

  protected get hasNext(): boolean {
    if (!this.history) {
      return false;
    }
    return this.history.offset + this.history.content.length < this.history.total;
  }

  protected get hasPrevious(): boolean {
    return this.currentOffset > 0;
  }

  protected next(): void {
    if (!this.hasNext) {
      return;
    }
    this.pageRequested.emit({ offset: this.currentOffset + this.limit, limit: this.limit });
  }

  protected previous(): void {
    if (!this.hasPrevious) {
      return;
    }
    const previousOffset = Math.max(0, this.currentOffset - this.limit);
    this.pageRequested.emit({ offset: previousOffset, limit: this.limit });
  }
}
