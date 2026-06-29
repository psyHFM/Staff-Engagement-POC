package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.TaskId;
import java.time.Instant;

/**
 * Read model for a single task sub-item (checklist entry), exposed by
 * {@link TaskContract} via the additive
 * {@link TaskSummaryWithItems} wrapper.
 *
 * <p>Added in v1.1.0 (2026-06-25, change
 * {@code atse1-25-35-ux-walkthrough-fixes}) as part of the task
 * subtasks feature (ATSE1-34).
 */
public record TaskItemSummary(
        long id,
        TaskId taskId,
        int ordinal,
        String title,
        boolean completed,
        Instant createdAt) {
}
