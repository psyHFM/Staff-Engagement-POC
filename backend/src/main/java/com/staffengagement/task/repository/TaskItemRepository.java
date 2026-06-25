package com.staffengagement.task.repository;

import com.staffengagement.task.domain.TaskItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskItemRepository extends JpaRepository<TaskItem, Long> {

    /** Returns the items for a given task, ordered by ordinal ascending. */
    List<TaskItem> findByTaskIdOrderByOrdinalAsc(Long taskId);
}