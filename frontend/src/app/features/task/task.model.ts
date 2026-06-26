/**
 * Typed identifier for a Task — matches the backend {@code TaskId} record.
 * Wire form is {@code {"value": N}}.
 */
export interface TaskId {
  readonly value: number;
}

/**
 * Typed identifier for an Employee — matches the backend {@code EmployeeId} record.
 * Wire form is {@code {"value": N}}.
 */
export interface EmployeeId {
  readonly value: number;
}

/**
 * Read model for a Task — matches the backend {@code TaskSummary} record.
 * Wire form uses camelCase keys with typed IDs as {@code {"value": N}} objects.
 */
export interface Task {
  readonly id: TaskId;
  readonly subject: EmployeeId;
  readonly title: string;
  readonly sourceInteractionId?: EmployeeId;
  readonly completed: boolean;
  readonly description: string;
  readonly createdAt: string;
  readonly completedAt?: string;
}

/**
 * Request body for {@code POST /api/v1/tasks}.
 * {@code subjectId} is a numeric employee id; {@code sourceInteractionId}
 * is an optional numeric interaction id.
 */
export interface CreateTaskRequest {
  subjectId: number;
  title: string;
  description: string;
  sourceInteractionId?: number;
}
