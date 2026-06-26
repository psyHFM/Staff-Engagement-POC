import { Injectable, signal } from '@angular/core';

/**
 * Base state-service pattern (frontend-state.yaml).
 *
 * Conventions every feature state service follows:
 *   1. State is held in private `signal`s; only read models are public.
 *   2. Derived state is exposed via `computed()` — never set manually.
 *   3. Components do not touch signals directly; they call handler methods
 *      (e.g. `updateUser(data)`), which perform the API call and then update
 *      the signal inside the service (side effects live here, not in components).
 *   4. Async data flows RxJS → Signal via `toSignal()` when a stream needs to
 *      feed the template.
 *   5. State is in-memory and resets on page reload — with the single
 *      documented carve-out: the issued JWT, persisted via
 *      {@code AuthState}/{@code AuthStorage} under
 *      {@code staff-engagement:token} in {@code sessionStorage}
 *      (see frontend-state.yaml → persistence.carve_outs and AuthState
 *      for the rationale).
 *
 * Phase 0 ships only this documented base; per-feature state services
 * (EmployeeState, InteractionState, …) land in Phases 1–5.
 */
@Injectable()
export abstract class StateService {
  protected readonly loading = signal(false);

  protected beginLoad(): void {
    this.loading.set(true);
  }

  protected endLoad(): void {
    this.loading.set(false);
  }
}