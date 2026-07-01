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
  readonly sourceInteractionId?: InteractionId;
  readonly completed: boolean;
  readonly description: string;
  readonly createdAt: string;
  readonly completedAt?: string;
}

/**
 * Typed identifier for an Interaction — matches the backend {@code InteractionId} record.
 * Wire form is {@code {"value": N}}.
 */
export interface InteractionId {
  readonly value: number;
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

/**
 * Request body for {@code PUT /api/v1/tasks/{id}}.
 * Any non-null field overwrites the persisted value; null or undefined
 * fields leave the existing value untouched.
 */
export interface UpdateTaskRequest {
  title?: string | null;
  description?: string | null;
  completed?: boolean | null;
}

/**
 * Additive sub-item model for the ATSE1-34 task subtasks feature.
 *
 * Mirrors the backend {@code com.staffengagement.shared.api.TaskItemSummary}
 * record. The list endpoint returns bare {@link Task} instances; the detail
 * endpoint {@code GET /api/v1/tasks/{id}} returns a {@link TaskWithItems}
 * wrapper that carries the items in ordinal order.
 */
export interface TaskItem {
  /** Wire id is a JSON number; typed as string to match the project pattern (see SkillEntry.id). */
  id: string;
  /** Parent task id — kept for client-side guard rails. */
  taskId: string;
  /** Backend-issued display order; the response array is always sorted by this ascending. */
  ordinal: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface TaskWithItems {
  base: Task;
  items: TaskItem[];
}

export interface CreateTaskItemRequest {
  title: string;
}

export interface PatchTaskItemRequest {
  title?: string | null;
  completed?: boolean | null;
}

/** Item ids in the desired order; sent to {@code PUT /api/v1/tasks/{taskId}/items/reorder}. */
export interface TaskItemReorderRequest {
  itemIds: number[];
}
