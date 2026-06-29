package com.staffengagement.task.domain;

import com.staffengagement.shared.kernel.TaskId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A single sub-item (checklist entry) on a Task.
 *
 * <p>Added in v1.1.0 (2026-06-25, change
 * {@code atse1-25-35-ux-walkthrough-fixes}) as part of the task
 * subtasks feature (ATSE1-34). Each {@link Task} may have zero or
 * more {@code TaskItem} rows, ordered by {@link #ordinal} ascending.
 *
 * <p>The {@code task_id} column is a logical reference to
 * {@link Task#getId()}; no DB foreign key is declared because
 * {@code task..} follows the cross-module boundary convention
 * (referential integrity is enforced at the service layer).
 */
@Entity
@Table(name = "task_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(name = "ordinal", nullable = false)
    private int ordinal;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "completed", nullable = false)
    private boolean completed;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public TaskId getTaskId() {
        return new TaskId(taskId);
    }
}