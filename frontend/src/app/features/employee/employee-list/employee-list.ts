import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmployeeResponse, EMPLOYEE_SORTS, Paged } from '../employee.types';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { Badge } from '../../../shared/ui/badge/badge';

/** Emitted when the user requests a different page of results. */
export interface PageRequest {
  readonly offset: number;
  readonly limit: number;
}

/**
 * Renders the paginated employee directory with a sort control.
 *
 * <p>Pure presentation component (frontend-state.yaml): receives the {@link Paged}
 * directory, the loading flag, and the current sort; emits page-change, sort-change,
 * and row-selection events to the parent. Each row links to the employee's dedicated
 * profile page. Visible to all authenticated users.
 */
@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [RouterLink, Avatar, Badge],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeList {
  @Input({ required: true }) directory: Paged<EmployeeResponse> | null = null;
  @Input({ required: true }) loading = false;
  @Input({ required: true }) sort = 'createdAt,desc';
  @Output() pageRequested = new EventEmitter<PageRequest>();
  @Output() sortRequested = new EventEmitter<string>();
  @Output() selected = new EventEmitter<EmployeeResponse>();

  protected readonly sorts = EMPLOYEE_SORTS;
  protected readonly limit = 20;

  /**
   * Client-side search over the loaded page (name / email / department).
   * The backend has no `?q=` filter and adding one is out of scope for this
   * presentation change; the directory is small in the POC so filtering the
   * current page is sufficient (frontend-redesign §5.3).
   */
  protected readonly query = signal('');

  /** The rows to render after applying the search filter. */
  protected visible(): EmployeeResponse[] {
    const all = this.directory?.content ?? [];
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return all;
    }
    return all.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q)
    );
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected get currentOffset(): number {
    return this.directory?.offset ?? 0;
  }

  protected get hasNext(): boolean {
    if (!this.directory) {
      return false;
    }
    return this.directory.offset + this.directory.content.length < this.directory.total;
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

  protected onSortChange(event: Event): void {
    this.sortRequested.emit((event.target as HTMLSelectElement).value);
  }
}