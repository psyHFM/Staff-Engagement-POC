package com.staffengagement.task.service;

import com.staffengagement.shared.api.TaskSummary;
import com.staffengagement.task.domain.Task;
import com.staffengagement.task.repository.TaskRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

/**
 * BDD unit tests for the {@code Task -> TaskSummary} mapping fix
 * (ATSE1-31 / openSpec §7.5 / §7.8).
 *
 * <p>Before the fix, {@link TaskService#toSummary} mapped
 * {@code task.getDescription()} into BOTH the {@code title} and
 * {@code description} slots of the summary — a latent bug that
 * surfaced as every task reading "the description, twice". The
 * mapper is now distinct: {@code title -> task.getTitle()} and
 * {@code description -> task.getDescription()}.
 *
 * <p>Mockito-only — no Spring context (integration testing is
 * disabled per the constitution).
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceMappingTest {

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private TaskService taskService;

    @Test
    @DisplayName("Should map title and description to distinct summary fields")
    void toSummary_mapsTitleAndDescriptionDistinctly() {
        // Given — a task whose title and description carry different values
        Task task = Task.builder()
                .id(100L)
                .subjectId(1L)
                .title("Follow up")
                .description("Send the email")
                .completed(false)
                .build();
        given(taskRepository.findBySubjectId(1L)).willReturn(List.of(task));

        // When
        List<TaskSummary> result = taskService.tasksForEmployee(
                new com.staffengagement.shared.kernel.EmployeeId(1L));

        // Then — title and description are distinct fields
        TaskSummary summary = result.get(0);
        assertThat(summary.title()).isEqualTo("Follow up");
        assertThat(summary.description()).isEqualTo("Send the email");
        // Title MUST NOT equal description (the §7.5 regression test)
        assertThat(summary.title()).isNotEqualTo(summary.description());
    }

    @Test
    @DisplayName("Should default a missing title to an empty string (NOT to description)")
    void toSummary_preservesBlankTitleAsEmptyString() {
        // Given — a task created before the title column was populated
        Task task = Task.builder()
                .id(101L)
                .subjectId(1L)
                .title("")
                .description("Legacy body text")
                .completed(false)
                .build();
        given(taskRepository.findBySubjectId(1L)).willReturn(List.of(task));

        // When
        List<TaskSummary> result = taskService.tasksForEmployee(
                new com.staffengagement.shared.kernel.EmployeeId(1L));

        // Then — title stays empty (the field's NOT NULL DEFAULT '' contract)
        assertThat(result.get(0).title()).isEqualTo("");
        assertThat(result.get(0).description()).isEqualTo("Legacy body text");
    }

    @Test
    @DisplayName("Should return an empty list when no tasks exist (mapping is never invoked)")
    void toSummary_emptyListReturnsEmpty() {
        // Given
        given(taskRepository.findBySubjectId(1L)).willReturn(Collections.emptyList());

        // When
        List<TaskSummary> result = taskService.tasksForEmployee(
                new com.staffengagement.shared.kernel.EmployeeId(1L));

        // Then
        assertThat(result).isEmpty();
    }
}