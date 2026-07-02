/**
 * Frozen interaction vocabulary from the constitution (ROADMAP §3 / MISSION §3).
 * Mirrors {@link com.staffengagement.shared.kernel.InteractionType}.
 */
export type InteractionType =
  | 'check-in'
  | 'mentoring'
  | 'catch-up'
  | 'performance'
  | 'other';

/** All interaction types with display labels. */
export const INTERACTION_TYPES: readonly { readonly value: InteractionType; readonly label: string }[] = [
  { value: 'check-in', label: 'Check-in' },
  { value: 'mentoring', label: 'Mentoring' },
  { value: 'catch-up', label: 'Catch-up' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' }
];

/** Typed identifier for an Employee — matches the backend {@code EmployeeId} record. */
export interface EmployeeId {
  readonly value: number;
}

/** Typed identifier for an Interaction — matches the backend {@code InteractionId} record. */
export interface InteractionId {
  readonly value: number;
}

/** Read model for an Interaction — matches the backend {@code InteractionSummary} record. */
export interface InteractionSummary {
  readonly id: InteractionId;
  readonly type: InteractionType;
  readonly subject: EmployeeId;
  readonly facilitator: EmployeeId;
  readonly facilitatorName: string;
  readonly note: string;
  readonly createdAt: string;
  readonly subjectText?: string;
  readonly archivedBySubject?: boolean;
  readonly archivedByFacilitator?: boolean;
  readonly deletedBySubject?: boolean;
  readonly deletedByFacilitator?: boolean;
}

/** Offset-paginated response — matches the backend {@code Paged<T>} record. */
export interface Paged<T> {
  readonly content: T[];
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
}

/** Lightweight employee option used while the Phase 1 employee API is not yet available. */
export interface EmployeeOption {
  readonly id: EmployeeId;
  readonly fullName: string;
}

/** Request body for {@code POST /api/v1/interactions}. */
export interface CreateInteractionRequest {
  readonly type: InteractionType;
  readonly subject: EmployeeId;
  readonly facilitator: EmployeeId;
  readonly subjectText: string;
  readonly note: string;
}
