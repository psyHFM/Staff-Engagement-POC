import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { ApiClient, catchApiError } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/error-envelope';
import { StateService } from '../../shared/state/state.service';
import { Paged, SkillSearch, SkillSortOption, SkillStrength, SkillSummary } from './skills.types';

const SORT_STORAGE_KEY = 'skills.sortOption';
const VALID_SORT_OPTIONS = new Set<SkillSortOption>([
  'default',
  'name-asc',
  'name-desc',
  'years-asc',
  'years-desc',
  'projects-desc'
]);

/**
 * Skills feature state (frontend-state.yaml).
 *
 * State map:
 *   - Global/feature signals: `_query`, `_results`, `_error`, `_popular`, `_sortOption`
 *     live in this service. They are exposed read-only via computed() read models.
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
  private readonly _popular = signal<readonly SkillSummary[] | null>(null);
  private readonly _sortOption = signal<SkillSortOption>(restoreSortOption());

  /** Canonical query string that produced the current (or last attempted) results. */
  readonly query = computed(() => this._query());

  /** Current page of ranked skill strengths, or null before the first search. */
  readonly results = computed(() => this._results());

  /** Last API error, or null when no error is present. */
  readonly error = computed(() => this._error());

  /** Aggregated popular-skills grid (ATSE1-40), or null before the first load. */
  readonly popular = computed(() => this._popular());

  /** User-selected sort option (ATSE1-43); 'default' means use the backend ranking. */
  readonly sortOption = computed(() => this._sortOption());

  /** The API `sort=` value to forward with the next search, or undefined for default. */
  readonly sortParam = computed(() => toSortParam(this._sortOption()));

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
    const sort = options.sort ?? this.sortParam();
    if (sort !== undefined && sort.trim().length > 0) {
      params['sort'] = sort;
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

  /**
   * Load the aggregated "popular skills" grid (ATSE1-40). Defaults to the top 20.
   * Errors are surfaced via the same `error` channel as search so the existing
   * banner handles them; `_popular` is cleared on failure so stale tiles don't linger.
   */
  loadPopular(limit = 20): void {
    this.beginLoad();
    this.api
      .get<readonly SkillSummary[]>('skills/popular', { limit })
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: (summaries) => {
          this._error.set(null);
          this._popular.set(summaries);
        },
        error: (err) => {
          this._popular.set(null);
          this._error.set(err as ApiError);
        }
      });
  }

  /**
   * Update the sort option (ATSE1-43) and persist to sessionStorage. Callers are
   * expected to trigger a fresh `search(...)` after this so the new ordering takes
   * effect immediately.
   */
  setSortOption(option: SkillSortOption): void {
    if (!VALID_SORT_OPTIONS.has(option)) {
      return;
    }
    this._sortOption.set(option);
    persistSortOption(option);
  }

  /** Reset all feature state (query, results, error, popular, loading). */
  clear(): void {
    this._query.set('');
    this._results.set(null);
    this._error.set(null);
    this._popular.set(null);
    this.endLoad();
  }
}

function restoreSortOption(): SkillSortOption {
  if (typeof sessionStorage === 'undefined') {
    return 'default';
  }
  const raw = sessionStorage.getItem(SORT_STORAGE_KEY);
  if (raw && VALID_SORT_OPTIONS.has(raw as SkillSortOption)) {
    return raw as SkillSortOption;
  }
  return 'default';
}

function persistSortOption(option: SkillSortOption): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(SORT_STORAGE_KEY, option);
  } catch {
    // sessionStorage can throw in private-browsing modes — fail silent.
  }
}

function toSortParam(option: SkillSortOption): string | undefined {
  switch (option) {
    case 'default':
      return undefined;
    case 'name-asc':
      return 'name,asc';
    case 'name-desc':
      return 'name,desc';
    case 'years-asc':
      return 'years,asc';
    case 'years-desc':
      return 'years,desc';
    case 'projects-desc':
      return 'projectCount,desc';
    default:
      return undefined;
  }
}