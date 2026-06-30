import { ChangeDetectionStrategy, Component, EventEmitter, Output, effect, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApiClient, catchApiError } from '../../api/api-client';
import { ApiError } from '../../api/error-envelope';
import { StateService } from '../../state/state.service';
import { InteractionSummary, Paged } from '../../../features/interaction/interaction.types';

/**
 * Lightweight interaction selector for forms (ATSE1-38).
 *
 * <p>Signal-only contract: parent binds {@link value} (numeric id) and
 * listens to {@link valueChange} (per frontend-state.yaml ->
 * primary_mechanism). The picker is intentionally NOT a control-value
 * accessor — {@code [(ngModel)]} inside the picker would create a hidden
 * two-way binding against the public signal and break the unidirectional
 * data flow. The parent template re-binds on the change event:
 * <pre>
 *   &lt;app-interaction-picker
 *     [value]="request.sourceInteractionId()"
 *     (valueChange)="request.sourceInteractionId.set($event)"/&gt;
 * </pre>
 *
 * <p>Optionally filters interactions by subject (employee) when {@link subjectId}
 * is provided (ATSE1-37 cascading).
 *
 * <p>ATSE1-37: When an interaction is selected, also emits the interaction's
 * subject id so the parent can pin the employee dropdown.
 */
@Component({
  selector: 'app-interaction-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './interaction-picker.html',
  styleUrls: ['./interaction-picker.scss']
})
export class InteractionPicker extends StateService implements OnInit {
  private readonly api = inject(ApiClient);

  /** Currently-selected interaction id (numeric). Null = no selection. */
  readonly value = input<number | null>(null);

  /** Optional subject (employee) filter for cascading (ATSE1-37). */
  readonly subjectId = input<number | null>(null);

  /** Whether the picker is readonly. */
  readonly readonly = input<boolean>(false);
  /** Emits the new id whenever the user picks a different interaction. */
  @Output() readonly valueChange = new EventEmitter<number | null>();

  /** Emits the interaction's subject id when an interaction is selected (ATSE1-37). */
  @Output() readonly subjectIdChange = new EventEmitter<number | null>();

  /** All interactions the picker has loaded. */
  private readonly interactions = signal<InteractionSummary[]>([]);

  /** Track if we've done the initial load (effect should only trigger on subsequent changes). */
  private readonly initialLoadDone = signal<boolean>(false);

  /** Loading + error mirrors for the directory fetch. */
  private readonly lastError = signal<ApiError | null>(null);
  readonly options = this.interactions.asReadonly();
  readonly error = this.lastError.asReadonly();
  readonly isLoading = this.loading;

  constructor() {
    super();
    // Reload interactions when subjectId changes (after initial load)
    effect(() => {
      const subject = this.subjectId();
      if (subject !== undefined && this.initialLoadDone()) {
        this.loadInteractions();
      }
    });
  }

  ngOnInit(): void {
    this.loadInteractions();
    this.initialLoadDone.set(true);
  }

  /**
   * Fetches {@code GET /api/v1/employees/[subjectId]/interactions} with a wide page (100 rows).
   * If subjectId is provided, filters to that employee's interactions.
   * If subjectId is null, clears the interaction list (no endpoint exists for all interactions).
   * For the POC, loads interactions with a wide page; a real deployment
   * would either accept a wider page or layer in a server-side search.
   */
  loadInteractions(): void {
    this.beginLoad();
    this.lastError.set(null);

    const subject = this.subjectId();
    if (subject === null) {
      // No subject filter - clear interactions
      this.interactions.set([]);
      this.endLoad();
      return;
    }

    const endpoint = `employees/${subject}/interactions`;

    this.api
      .get<Paged<InteractionSummary>>(endpoint, { offset: 0, limit: 100 })
      .pipe(catchApiError())
      .subscribe({
        next: (page) => {
          this.interactions.set(page.content);
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
      this.subjectIdChange.emit(null);
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      this.valueChange.emit(parsed);
      // Emit the subject id for cascading (ATSE1-37)
      const interaction = this.interactions().find(i => i.id.value === parsed);
      this.subjectIdChange.emit(interaction?.subject.value ?? null);
    } else {
      this.valueChange.emit(null);
      this.subjectIdChange.emit(null);
    }
  }
}
