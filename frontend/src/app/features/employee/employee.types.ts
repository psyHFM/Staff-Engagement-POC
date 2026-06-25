/**
 * Frozen employee vocabulary from the constitution (ROADMAP §3 / MISSION §3).
 * Mirrors the backend employee DTOs: {@link com.staffengagement.employee.service.EmployeeResponse},
 * {@link com.staffengagement.employee.controller.dto.CreateEmployeeRequest} and
 * {@link com.staffengagement.employee.controller.dto.UpdateEmployeeRequest}.
 *
 * <p>JSON casing follows {@code api-standards.yaml}: camelCase keys. {@code role}
 * and {@code level} use the lowercase enum wire form (e.g. {@code admin},
 * {@code senior}) — NOT the {@code name()} form used in the JWT {@code roles} claim.
 */

/** Typed identifier for an Employee — matches the backend {@code EmployeeId} record (wire form {@code {"value":N}}). */
export interface EmployeeId {
  readonly value: number;
}

/** Employee role — JSON form is lowercase (mirrors {@code shared/kernel.EmployeeRole}). */
export type EmployeeRole = 'employee' | 'admin';

/** Employee seniority level — JSON form is lowercase (mirrors {@code employee/domain.EmployeeLevel}). Optional. */
export type EmployeeLevel = 'junior' | 'intermediate' | 'senior';

/** All employee roles with display labels. */
export const EMPLOYEE_ROLES: readonly { readonly value: EmployeeRole; readonly label: string }[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'admin', label: 'Admin' }
];

/** All employee levels with display labels. */
export const EMPLOYEE_LEVELS: readonly { readonly value: EmployeeLevel; readonly label: string }[] = [
  { value: 'junior', label: 'Junior' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'senior', label: 'Senior' }
];

/**
 * Sort options for the directory. Fields match the backend list sort whitelist
 * ({@code fullName,email,department,level,createdAt} — {@code EmployeeService.list}).
 */
export const EMPLOYEE_SORTS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'fullName,asc', label: 'Name A–Z' },
  { value: 'email,asc', label: 'Email A–Z' },
  { value: 'department,asc', label: 'Department A–Z' },
  { value: 'level,asc', label: 'Level A–Z' }
];

/** Offset-paginated response — matches the backend {@code Paged<T>} record. */
export interface Paged<T> {
  readonly content: T[];
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
}

/**
 * Full-field read model — mirrors the backend {@code EmployeeResponse} record
 * (camelCase, unwrapped). Optional fields are absent when null server-side
 * ({@code NON_NULL} inclusion).
 */
export interface EmployeeResponse {
  readonly id: EmployeeId;
  readonly fullName: string;
  readonly email: string;
  readonly role: EmployeeRole;
  readonly jobTitle?: string | null;
  readonly department?: string | null;
  readonly level?: EmployeeLevel | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/** Request body for {@code POST /api/v1/employees} — self-service create; NO {@code email}, NO {@code role}. */
export interface CreateEmployeeRequest {
  readonly fullName: string;
  readonly jobTitle?: string | null;
  readonly department?: string | null;
  readonly level?: EmployeeLevel | null;
}

/**
 * Request body for {@code PUT /api/v1/employees/{id}} — full replace of
 * {@code fullName}/{@code jobTitle}/{@code department}/{@code level}; {@code role}
 * honoured only when the caller is an ADMIN; {@code email} is immutable
 * (send {@code null} to leave it untouched — the backend rejects a differing value with 400).
 */
export interface UpdateEmployeeRequest {
  readonly fullName: string;
  readonly jobTitle?: string | null;
  readonly department?: string | null;
  readonly level?: EmployeeLevel | null;
  readonly role?: EmployeeRole | null;
  readonly email?: string | null;
}