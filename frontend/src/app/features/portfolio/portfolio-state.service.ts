import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiClient, catchApiError } from '../../shared/api/api-client';
import { StateService } from '../../shared/state/state.service';
import { Portfolio, SkillEntry, EducationEntry, ProjectEntry, LinkEntry, emptyPortfolio } from './portfolio.model';
import { finalize } from 'rxjs';

/**
 * Portfolio feature state (frontend-state.yaml).
 *
 * State map:
 *   - Global signal: `_portfolio` (the active employee's portfolio) → exposed read-only
 *     via `portfolio` (computed). `loading` is the global load flag from the base class.
 *   - Local UI state (which employee is being viewed, form inputs) lives in the
 *     component, not here.
 *
 * Unidirectional flow: components call handler methods (e.g. `addSkill`); the service
 * performs the HTTP call and updates the `_portfolio` signal inside the handler. RxJS
 * fetches are bridged to signals by `.set()`/`.update()` in the subscribe (the data
 * itself is the signal payload; no `toSignal()` is needed for these one-shot request/
 * response calls — that bridge is for streaming sources). No `BehaviorSubject` is used.
 */
@Injectable({ providedIn: 'root' })
export class PortfolioStateService extends StateService {
  private readonly api = inject(ApiClient);

  private readonly _portfolio = signal<Portfolio | null>(null);

  /** Read-only view of the active portfolio (null until the first load succeeds). */
  readonly portfolio = computed(() => this._portfolio());
  override readonly loading = signal(false);

  /** Base path for an employee's portfolio sub-resources (kebab-case). */
  private base(employeeId: string): string {
    return `employees/${employeeId}/portfolio`;
  }

  /** Load the full portfolio for an employee (GET /api/v1/employees/{id}/portfolio). */
  loadPortfolio(employeeId: string): void {
    this.beginLoad();
    this.api.get<Portfolio>(this.base(employeeId))
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad())
      )
      .subscribe({
        next: (portfolio) => this._portfolio.set(portfolio),
        error: (err) => console.error('Failed to load portfolio:', err)
      });
  }

  // ---- Skills ----

  addSkill(employeeId: string, entry: Omit<SkillEntry, 'id'>): void {
    this.beginLoad();
    this.api.post<SkillEntry>(`${this.base(employeeId)}/skills`, entry)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: (created) => this._portfolio.update(p => p ? { ...p, skills: [...p.skills, created] } : p),
        error: (err) => console.error('Failed to add skill:', err)
      });
  }

  updateSkill(employeeId: string, entry: SkillEntry): void {
    this.beginLoad();
    this.api.put<SkillEntry>(`${this.base(employeeId)}/skills/${entry.id}`, entry)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: (updated) => this._portfolio.update(p => p ? { ...p, skills: p.skills.map(s => s.id === updated.id ? updated : s) } : p),
        error: (err) => console.error('Failed to update skill:', err)
      });
  }

  removeSkill(employeeId: string, entryId: string): void {
    this.beginLoad();
    this.api.delete<void>(`${this.base(employeeId)}/skills/${entryId}`)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: () => this._portfolio.update(p => p ? { ...p, skills: p.skills.filter(s => s.id !== entryId) } : p),
        error: (err) => console.error('Failed to remove skill:', err)
      });
  }

  // ---- Education ----

  addEducation(employeeId: string, entry: Omit<EducationEntry, 'id'>): void {
    this.beginLoad();
    this.api.post<EducationEntry>(`${this.base(employeeId)}/education`, entry)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: (created) => this._portfolio.update(p => p ? { ...p, education: [...p.education, created] } : p),
        error: (err) => console.error('Failed to add education:', err)
      });
  }

  removeEducation(employeeId: string, entryId: string): void {
    this.beginLoad();
    this.api.delete<void>(`${this.base(employeeId)}/education/${entryId}`)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: () => this._portfolio.update(p => p ? { ...p, education: p.education.filter(e => e.id !== entryId) } : p),
        error: (err) => console.error('Failed to remove education:', err)
      });
  }

  // ---- Projects ----

  addProject(employeeId: string, entry: Omit<ProjectEntry, 'id'>): void {
    this.beginLoad();
    this.api.post<ProjectEntry>(`${this.base(employeeId)}/projects`, entry)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: (created) => this._portfolio.update(p => p ? { ...p, projects: [...p.projects, created] } : p),
        error: (err) => console.error('Failed to add project:', err)
      });
  }

  removeProject(employeeId: string, entryId: string): void {
    this.beginLoad();
    this.api.delete<void>(`${this.base(employeeId)}/projects/${entryId}`)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: () => this._portfolio.update(p => p ? { ...p, projects: p.projects.filter(pr => pr.id !== entryId) } : p),
        error: (err) => console.error('Failed to remove project:', err)
      });
  }

  // ---- Links ----

  addLink(employeeId: string, entry: Omit<LinkEntry, 'id'>): void {
    this.beginLoad();
    this.api.post<LinkEntry>(`${this.base(employeeId)}/links`, entry)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: (created) => this._portfolio.update(p => p ? { ...p, links: [...p.links, created] } : p),
        error: (err) => console.error('Failed to add link:', err)
      });
  }

  removeLink(employeeId: string, entryId: string): void {
    this.beginLoad();
    this.api.delete<void>(`${this.base(employeeId)}/links/${entryId}`)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: () => this._portfolio.update(p => p ? { ...p, links: p.links.filter(l => l.id !== entryId) } : p),
        error: (err) => console.error('Failed to remove link:', err)
      });
  }

  /** Reset to an empty portfolio for a given employee (e.g. before a fresh load). */
  reset(employeeId: string): void {
    this._portfolio.set(emptyPortfolio(employeeId));
  }
}