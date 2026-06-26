/**
 * Feature-level types for the Skills register (Phase 5 frontend slice).
 *
 * Mirrors the backend contract in com.staffengagement.shared.api:
 *   - SkillStrength: one employee's strength in a single skill.
 *   - Paged<T>: offset-based pagination envelope.
 */
export interface EmployeeId {
  readonly value: number;
}

export interface SkillStrength {
  readonly employeeId: EmployeeId;
  readonly employeeName: string;
  readonly skill: string;
  readonly years: number;
  readonly projectCount: number;
}

export interface Paged<T> {
  readonly content: T[];
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
}

export interface SkillSearch {
  readonly name: string;
  readonly minYears?: number;
  readonly sort?: string;
  readonly offset?: number;
  readonly limit?: number;
}

/**
 * Aggregated view of one skill across all employees (ATSE1-40 "Popular skills"
 * grid). Mirrors the backend {@code SkillSummary} record.
 *
 * <p>Kept module-local — never crosses to {@code shared/api}.
 */
export interface SkillSummary {
  readonly skill: string;
  readonly employeeCount: number;
  readonly topHolder: SkillStrength | null;
}

/**
 * Sort options exposed in the UI dropdown (ATSE1-43). Mapped to the API's
 * {@code sort} query parameter; "default" omits the param so the backend applies
 * its native ranking ({@code years,desc}).
 */
export type SkillSortOption =
  | 'default'
  | 'name-asc'
  | 'name-desc'
  | 'years-asc'
  | 'years-desc'
  | 'projects-desc';
