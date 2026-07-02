import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';

import { InteractionSummary, Paged } from '../interaction.types';
import { Badge } from '../../../shared/ui/badge/badge';

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
 *
 * <p>Per-row actions (ATSE1-28, ATSE1-29):
 * <ul>
 *   <li>{@link rowEdit} — emitted when the user clicks the row's Edit button.
 *       The page opens an edit modal; the component does not know about it.</li>
 *   <li>{@link createTask} — emitted when the user clicks the row's
 *       "Create task" button. The page mounts a {@code TaskCreateForm} with
 *       the interaction's id pre-populated.</li>
 * </ul>
 * Both events bubble the full {@link InteractionSummary} so the page does
 * not need to re-look-it-up from the cached page.
 */
@Component({
  selector: 'app-interaction-list',
  imports: [DatePipe, Badge],
  templateUrl: './interaction-list.html',
  styleUrl: './interaction-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractionList {
  @Input({ required: true }) history: Paged<InteractionSummary> | null = null;
  @Input({ required: true }) loading = false;
  @Output() pageRequested = new EventEmitter<PageRequest>();
  @Output() rowEdit = new EventEmitter<InteractionSummary>();
  @Output() rowViewDetail = new EventEmitter<InteractionSummary>();
  @Output() createTask = new EventEmitter<InteractionSummary>();

  protected readonly limit = 20;

  protected get currentOffset(): number {
    return this.history?.offset ?? 0;
  }

  protected get contentLength(): number {
    return this.history?.content?.length ?? 0;
  }

  /** Debug info for troubleshooting - only shows when debug mode is enabled */
  protected debugInfo(): string {
    if (typeof ngDevMode === 'undefined' || !ngDevMode) {
      return '';
    }
    return `history: ${this.history ? 'SET' : 'NULL'} | content.length: ${this.contentLength} | total: ${this.history?.total ?? 'N/A'} | loading: ${this.loading}`;
  }

  protected get hasNext(): boolean {
    if (!this.history || !this.history.content) {
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

  protected onViewDetail(interaction: InteractionSummary): void {
    this.rowViewDetail.emit(interaction);
  }

  protected onEdit(interaction: InteractionSummary): void {
    this.rowEdit.emit(interaction);
  }

  protected onCreateTask(interaction: InteractionSummary): void {
    this.createTask.emit(interaction);
  }

  protected onActionsClick(event: Event): void {
    // Prevent row click when clicking action buttons
    event.stopPropagation();
  }
}
