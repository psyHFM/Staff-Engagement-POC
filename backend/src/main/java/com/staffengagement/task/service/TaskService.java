package com.staffengagement.task.service;

import com.staffengagement.shared.api.TaskContract;
import com.staffengagement.shared.api.TaskItemSummary;
import com.staffengagement.shared.api.TaskSummary;
import com.staffengagement.shared.api.TaskSummaryWithItems;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.TaskId;
import com.staffengagement.task.domain.Task;
import com.staffengagement.task.domain.TaskItem;
import com.staffengagement.task.repository.TaskItemRepository;
import com.staffengagement.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService implements TaskContract {

    private final TaskRepository taskRepository;
    private final TaskItemRepository taskItemRepository;

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
        return updateTask(id, null, null, completed);
    }

    /**
     * Updates a task's {@code title}, {@code description}, and/or
     * {@code completed} flag. Null title/description leaves the existing
     * value untouched; null completed leaves the flag untouched.
     *
     * @throws IllegalArgumentException if no task with the given id exists
     *     or if a non-null title is blank.
     */
    @Transactional
    public TaskSummary updateTask(Long id, String title, String description, Boolean completed) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id));
        if (title != null) {
            if (title.isBlank()) {
                throw new IllegalArgumentException("title is required");
            }
            task.setTitle(title);
        }
        if (description != null) {
            task.setDescription(description);
        }
        if (completed != null) {
            task.setCompleted(completed);
            task.setCompletedAt(completed ? Instant.now() : null);
        }
        return toSummary(taskRepository.save(task));
    }

    /**
     * ATSE1-34: returns a task with its sub-items wrapped in a
     * {@link TaskSummaryWithItems}, or empty if no task with that id exists.
     *
     * <p>This is the additive implementation of the v1.1.0 contract method
     * declared as a {@code default} on {@link TaskContract}. Cross-module
     * callers reach the items through this method, never through the
     * internal {@link TaskItemRepository}.
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<TaskSummaryWithItems> taskWithItems(TaskId id) {
        return taskRepository.findById(id.value())
                .map(task -> new TaskSummaryWithItems(
                        toSummary(task),
                        toItemSummaries(taskItemRepository.findByTaskIdOrderByOrdinalAsc(id.value()))));
    }

    /**
     * Appends a new item to the end of the task's checklist. The ordinal is
     * assigned as {@code max(existing) + 1}, defaulting to 0 for an empty
     * checklist.
     *
     * @throws IllegalArgumentException if no task with the given id exists.
     */
    @Transactional
    public TaskItemSummary addItem(Long taskId, String title) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));
        List<TaskItem> existing = taskItemRepository.findByTaskIdOrderByOrdinalAsc(taskId);
        int nextOrdinal = existing.isEmpty() ? 0 : existing.get(existing.size() - 1).getOrdinal() + 1;
        TaskItem saved = taskItemRepository.save(TaskItem.builder()
                .taskId(task.getId().value())
                .ordinal(nextOrdinal)
                .title(title)
                .completed(false)
                .build());
        return toItemSummary(saved);
    }

    /**
     * Patches an item's {@code title} and {@code completed} fields. Both
     * fields are updated when non-null; a null field leaves the existing
     * value untouched.
     *
     * @throws IllegalArgumentException if either the task or the item is
     *     not found, or the item does not belong to the task.
     */
    @Transactional
    public TaskItemSummary updateItem(Long taskId, Long itemId, String title, Boolean completed) {
        TaskItem item = requireItemForTask(taskId, itemId);
        if (title != null) {
            item.setTitle(title);
        }
        if (completed != null) {
            item.setCompleted(completed);
        }
        return toItemSummary(taskItemRepository.save(item));
    }

    /**
     * Deletes an item from the task's checklist. Re-numbers the remaining
     * items so their ordinals stay contiguous starting at 0.
     *
     * @throws IllegalArgumentException if the task or item is not found, or
     *     the item does not belong to the task.
     */
    @Transactional
    public void deleteItem(Long taskId, Long itemId) {
        requireItemForTask(taskId, itemId);
        taskItemRepository.deleteById(itemId);
        // Re-number remaining items so ordinals stay contiguous
        List<TaskItem> remaining = taskItemRepository.findByTaskIdOrderByOrdinalAsc(taskId);
        for (int i = 0; i < remaining.size(); i++) {
            TaskItem it = remaining.get(i);
            if (it.getOrdinal() != i) {
                it.setOrdinal(i);
                taskItemRepository.save(it);
            }
        }
    }

    /**
     * Bulk-reorders the task's checklist by assigning each item the
     * ordinal at its position in {@code itemIds}. Items not present in
     * {@code itemIds} are appended in their existing order.
     *
     * @throws IllegalArgumentException if the task is not found, or if any
     *     item id in {@code itemIds} does not belong to the task.
     */
    @Transactional
    public List<TaskItemSummary> reorderItems(Long taskId, List<Long> itemIds) {
        if (!taskRepository.existsById(taskId)) {
            throw new IllegalArgumentException("Task not found: " + taskId);
        }
        List<TaskItem> existing = taskItemRepository.findByTaskIdOrderByOrdinalAsc(taskId);
        // Verify all provided item ids belong to this task
        java.util.Set<Long> existingIds = existing.stream().map(TaskItem::getId).collect(Collectors.toSet());
        for (Long id : itemIds) {
            if (!existingIds.contains(id)) {
                throw new IllegalArgumentException(
                        "Item " + id + " does not belong to task " + taskId);
            }
        }
        // Build a map from itemId -> ordinal position
        java.util.Map<Long, Integer> targetOrdinal = new java.util.HashMap<>();
        int position = 0;
        for (Long id : itemIds) {
            targetOrdinal.put(id, position++);
        }
        // Append items not in the explicit list (preserves existing order)
        for (TaskItem item : existing) {
            if (!targetOrdinal.containsKey(item.getId())) {
                targetOrdinal.put(item.getId(), position++);
            }
        }
        // Apply and persist
        for (TaskItem item : existing) {
            int newOrdinal = targetOrdinal.get(item.getId());
            if (item.getOrdinal() != newOrdinal) {
                item.setOrdinal(newOrdinal);
                taskItemRepository.save(item);
            }
        }
        return toItemSummaries(taskItemRepository.findByTaskIdOrderByOrdinalAsc(taskId));
    }

    /** Returns the items for a given task in ordinal order. */
    @Transactional(readOnly = true)
    public List<TaskItemSummary> itemsForTask(Long taskId) {
        return toItemSummaries(taskItemRepository.findByTaskIdOrderByOrdinalAsc(taskId));
    }

    /**
     * Returns true if every item is completed OR the task is allowed to
     * be partially complete. A task with zero items is considered
     * "complete" only when its own {@code completed} flag is set; the
     * sub-items do not gate completion when none exist.
     */
    @Transactional(readOnly = true)
    public boolean isComplete(Task task, boolean allowPartialComplete) {
        if (task.isCompleted()) {
            return true;
        }
        List<TaskItem> items = taskItemRepository.findByTaskIdOrderByOrdinalAsc(task.getId().value());
        if (items.isEmpty()) {
            return false;
        }
        if (allowPartialComplete) {
            return items.stream().anyMatch(TaskItem::isCompleted);
        }
        return items.stream().allMatch(TaskItem::isCompleted);
    }

    /**
     * Deletes a task (ATSE1-83).
     *
     * <p>Only the subject (owner) can delete their task. The task and
     * all its sub-items are permanently removed from the database.
     *
     * @throws IllegalArgumentException if no task with the given id exists
     * @throws SecurityException if the actor is not the task subject
     */
    @Transactional
    public void deleteTask(TaskId id, EmployeeId actor) {
        Task task = taskRepository.findById(id.value())
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + id.value()));

        // Ownership check: only the subject can delete their task
        if (!task.getSubjectId().equals(actor.value())) {
            throw new SecurityException("Not authorized to delete this task: " + id.value());
        }

        taskRepository.delete(task);
    }

    // --- internal helpers ---------------------------------------------------

    private TaskItem requireItemForTask(Long taskId, Long itemId) {
        TaskItem item = taskItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + itemId));
        if (!item.getTaskId().value().equals(taskId)) {
            throw new IllegalArgumentException(
                    "Item " + itemId + " does not belong to task " + taskId);
        }
        return item;
    }

    /** Returns a summary representation of a task. */
    public TaskSummary toSummary(Task task) {
        return new TaskSummary(
                task.getId(),
                task.getSubjectId(),
                task.getTitle(),
                task.getSourceInteractionId(),
                task.isCompleted(),
                task.getDescription(),
                task.getCreatedAt()
        );
    }

    private TaskItemSummary toItemSummary(TaskItem item) {
        return new TaskItemSummary(
                item.getId(),
                item.getTaskId(),
                item.getOrdinal(),
                item.getTitle(),
                item.isCompleted(),
                item.getCreatedAt()
        );
    }

    private List<TaskItemSummary> toItemSummaries(List<TaskItem> items) {
        return items.stream().map(this::toItemSummary).collect(Collectors.toList());
    }
}
