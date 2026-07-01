import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApiClient, catchApiError } from '../../api/api-client';
import { ApiError } from '../../api/error-envelope';
import { StateService } from '../../state/state.service';
import { EmployeeResponse, Paged } from '../../../features/employee/employee.types';

/**
 * Lightweight employee selector for forms (ATSE1-30).
 *
 * <p>Signal-only contract: parent binds {@link value} (numeric id) and
 * listens to {@link valueChange} (per frontend-state.yaml →
 * primary_mechanism). The picker is intentionally NOT a control-value
 * accessor — {@code [(ngModel)]} inside the picker would create a hidden
 * two-way binding against the public signal and break the unidirectional
 * data flow. The parent template re-binds on the change event:
 * <pre>
 *   &lt;app-employee-picker
 *     [value]="request.subjectId()"
 *     (valueChange)="request.subjectId.set($event)"/&gt;
 * </pre>
 *
 * <p>Loads the directory on first paint and exposes a filtered list. For
 * directories >50 entries a simple typeahead filter appears; for smaller
 * lists a plain {@code <select>}. The directory fetch happens once per
 * picker instance — subsequent mounts read from the cached signal.
 */
@Component({
  selector: 'app-employee-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './employee-picker.html',
  styleUrls: ['./employee-picker.scss']
})
export class EmployeePicker extends StateService implements OnInit {
  private readonly api = inject(ApiClient);

  /** Currently-selected employee id (numeric). Null = no selection. */
  readonly value = input<number | null>(null);

  /** Whether the picker is readonly. */
  readonly readonly = input<boolean>(false);

  /** Visible field label. Configurable so the same picker serves Subject, Facilitator, etc. */
  readonly label = input<string>('Subject');

  /** Emits the new id whenever the user picks a different employee. */
  @Output() readonly valueChange = new EventEmitter<number | null>();

  /** All employees the picker has loaded. */
  private readonly employees = signal<EmployeeResponse[]>([]);

  /** Loading + error mirrors for the directory fetch. */
  private readonly lastError = signal<ApiError | null>(null);
  readonly options = this.employees.asReadonly();
  readonly error = this.lastError.asReadonly();
  readonly isLoading = this.loading;

  ngOnInit(): void {
    this.loadEmployees();
  }

  /**
   * Fetches {@code GET /api/v1/employees} with a wide page (100 rows).
   * The directories in the POC have <10 employees; a real deployment
   * would either accept a wider page or layer in a server-side search.
   */
  loadEmployees(): void {
    this.beginLoad();
    this.lastError.set(null);
    this.api
      .get<Paged<EmployeeResponse>>('employees', { offset: 0, limit: 100 })
      .pipe(catchApiError())
      .subscribe({
        next: (page) => {
          this.employees.set(page.content);
          this.endLoad();
        },
        error: (err: ApiError) => {
          this.lastError.set(err);
          this.endLoad();
        }
      });
  }

  /** Dropdown change handler — re-emits the new id upward. */
  protected onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const raw = target.value;
    if (raw === '') {
      this.valueChange.emit(null);
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    this.valueChange.emit(Number.isFinite(parsed) ? parsed : null);
  }
}
