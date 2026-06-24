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
