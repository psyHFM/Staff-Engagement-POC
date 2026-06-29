package com.staffengagement.shared.api;

import java.util.List;

/**
 * Additive wrapper for {@link TaskSummary} that carries the task's
 * sub-items (checklist entries).
 *
 * <p>Added in v1.1.0 (2026-06-25, change
 * {@code atse1-25-35-ux-walkthrough-fixes}) as part of the task
 * subtasks feature (ATSE1-34). The wrapper keeps
 * {@link TaskSummary} (a record) binary-compatible while still
 * exposing the new items array.
 *
 * <p>Returned by the additive
 * {@link TaskContract#taskWithItems(com.staffengagement.shared.kernel.TaskId)}
 * method. The list is ordered by {@code ordinal} ascending. The
 * {@code items} array is omitted from the JSON response when empty
 * (api-standards.yaml -> responses.null_handling).
 */
public record TaskSummaryWithItems(
        TaskSummary base,
        List<TaskItemSummary> items) {
}
