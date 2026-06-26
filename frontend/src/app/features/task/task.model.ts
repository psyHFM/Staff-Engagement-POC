export interface Task {
  id: string;
  subjectId: number;
  title: string;
  description: string;
  completed: boolean;
  sourceInteractionId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateTaskRequest {
  subjectId: number;
  title: string;
  description: string;
  sourceInteractionId?: string;
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

/** List of item ids in the desired order; sent to {@code PUT /api/v1/tasks/{taskId}/items/reorder}. */
export type TaskItemReorderRequest = string[];
