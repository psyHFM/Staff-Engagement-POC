package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.shared.kernel.TaskId;

/**
 * Read model for a Task, returned by {@link TaskContract}.
 *
 * <p>A task is person-level ({@code subject}) and has two origins: spawned from an
 * interaction (then {@code sourceInteractionId} is set) or created standalone (then it
 * is {@code null}). The link is optional in both cases. {@code description} is the
 * task text; {@code title} is retained for backward compatibility with earlier
 * consumers and carries the same value.
 */
public record TaskSummary(
        TaskId id,
        EmployeeId subject,
        String title,
        InteractionId sourceInteractionId,
        boolean completed,
        String description) {
}