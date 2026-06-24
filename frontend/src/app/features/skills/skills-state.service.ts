import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { ApiClient, catchApiError } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/error-envelope';
import { StateService } from '../../shared/state/state.service';
import { Paged, SkillSearch, SkillStrength } from './skills.types';

/**
 * Skills feature state (frontend-state.yaml).
 *
 * State map:
 *   - Global/feature signals: `_query`, `_results`, `_error` live in this service.
 *     They are exposed read-only via `query`, `results`, `error` computed() read models.
 *   - `loading` is inherited from the shared StateService base class and toggled via
 *     `beginLoad()` / `endLoad()`.
 *   - `isLoading` is a computed read model derived from `loading`.
 *   - Local UI state (the text in the <input> while the user types) lives in the
 *     component, not here.
 *
 * Unidirectional flow:
 *   Component action -> SkillsStateService.search(name) -> ApiClient.get('skills', params)
 *   -> RxJS response -> .set() on `_query` / `_results` / `_error` / `loading`
 *   -> computed read models propagate -> UI re-renders.
 *
 * No BehaviorSubject is used. Derived state is never set manually.
 */
@Injectable()
export class SkillsStateService extends StateService {
  private readonly api = inject(ApiClient);

  private readonly _query = signal<string>('');
  private readonly _results = signal<Paged<SkillStrength> | null>(null);
  private readonly _error = signal<ApiError | null>(null);

  /** Canonical query string that produced the current (or last attempted) results. */
  readonly query = computed(() => this._query());

  /** Current page of ranked skill strengths, or null before the first search. */
  readonly results = computed(() => this._results());

  /** Last API error, or null when no error is present. */
  readonly error = computed(() => this._error());

  /** True while a search request is in flight. */
  readonly isLoading = computed(() => this.loading());

  /**
   * Trigger a skill search.
   *
   * A blank query clears results and errors without calling the API, because the
   * backend rejects `name=` with a 400.
   */
  search(name: string, options: Omit<SkillSearch, 'name'> = {}): void {
    const trimmed = name.trim();
    this._query.set(name);

    if (trimmed.length === 0) {
      this._results.set(null);
      this._error.set(null);
      this.endLoad();
      return;
    }

    this._error.set(null);
    this.beginLoad();

    const params: Record<string, string | number> = { name: trimmed };
    if (options.minYears !== undefined) {
      params['minYears'] = options.minYears;
    }
    if (options.sort !== undefined && options.sort.trim().length > 0) {
      params['sort'] = options.sort;
    }
    if (options.offset !== undefined) {
      params['offset'] = options.offset;
    }
    if (options.limit !== undefined) {
      params['limit'] = options.limit;
    }

    this.api
      .get<Paged<SkillStrength>>('skills', params)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: (page) => this._results.set(page),
        error: (err) => {
          this._results.set(null);
          this._error.set(err as ApiError);
        }
      });
  }

  /** Reset all feature state (query, results, error, loading). */
  clear(): void {
    this._query.set('');
    this._results.set(null);
    this._error.set(null);
    this.endLoad();
  }
}
