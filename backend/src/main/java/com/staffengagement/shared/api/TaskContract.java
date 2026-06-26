package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.TaskId;
import java.util.List;
import java.util.Optional;

/**
 * Frozen cross-module port for the Task module (Phase 3 implements this).
 *
 * <p>Tasks are person-level. {@code tasksForEmployee} returns tasks targeting a given
 * employee; {@code myTasks} returns tasks for the authenticated user regardless of
 * creator. A task may originate from an interaction or be created standalone — the
 * optional source link is carried on {@link TaskSummary#sourceInteractionId()}.
 *
 * <p>v1.1.0 (2026-06-25, change {@code atse1-25-35-ux-walkthrough-fixes}):
 * added the additive {@link #taskWithItems(TaskId)} method so cross-module
 * callers can fetch a task with its sub-items (checklist) without coupling
 * to the task impl.
 */
public interface TaskContract {

    List<TaskSummary> tasksForEmployee(EmployeeId subject);

    List<TaskSummary> myTasks(EmployeeId currentUser);

    /**
     * Returns the task with its sub-items wrapped in a
     * {@link TaskSummaryWithItems}, or {@link Optional#empty()} if no
     * task with the given id exists. Default returns
     * {@link Optional#empty()} so the v1.0.0 implementations (and any
     * mock) do not break.
     */
    default Optional<TaskSummaryWithItems> taskWithItems(TaskId id) {
        return Optional.empty();
    }
}