package com.staffengagement.task.service;

import com.staffengagement.shared.api.TaskContract;
import com.staffengagement.shared.api.TaskSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.task.domain.Task;
import com.staffengagement.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService implements TaskContract {

    private final TaskRepository taskRepository;

    @Override
    @Transactional(readOnly = true)
    public List<TaskSummary> tasksForEmployee(EmployeeId subject) {
        return taskRepository.findBySubjectId(subject.value())
                .stream()
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskSummary> myTasks(EmployeeId currentUser) {
        // According to TaskContract: "returns tasks for the authenticated user regardless of creator"
        // In this simplified model, we assume tasks targeting the employee are their tasks.
        return tasksForEmployee(currentUser);
    }

    /**
     * Sets a task's completion state and stamps {@code completedAt} accordingly
     * (now when completing, cleared when reopening). Module-internal write
     * operation for the task controller — not part of the frozen cross-module
     * {@link TaskContract}, which only exposes reads.
     */
    @Transactional
    public TaskSummary toggleCompletion(Long id, boolean completed) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));
        task.setCompleted(completed);
        task.setCompletedAt(completed ? Instant.now() : null);
        return toSummary(taskRepository.save(task));
    }

    private TaskSummary toSummary(Task task) {
        return new TaskSummary(
                task.getId(),
                task.getSubjectId(),
                task.getDescription(),
                task.getSourceInteractionId(),
                task.isCompleted()
        );
    }
}
