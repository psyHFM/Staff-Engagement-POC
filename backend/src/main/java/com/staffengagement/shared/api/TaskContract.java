package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import java.util.List;

/**
 * Frozen cross-module port for the Task module (Phase 3 implements this).
 *
 * <p>Tasks are person-level. {@code tasksForEmployee} returns tasks targeting a given
 * employee; {@code myTasks} returns tasks for the authenticated user regardless of
 * creator. A task may originate from an interaction or be created standalone — the
 * optional source link is carried on {@link TaskSummary#sourceInteractionId()}.
 */
public interface TaskContract {

    List<TaskSummary> tasksForEmployee(EmployeeId subject);

    List<TaskSummary> myTasks(EmployeeId currentUser);
}