package com.staffengagement.task.service;

import com.staffengagement.shared.api.TaskSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.task.domain.Task;
import com.staffengagement.task.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

/**
 * BDD unit tests for {@link TaskService} (Phase 3 / testing-strategy.yaml).
 *
 * <p>Given-When-Then style, Mockito-only (no Spring context — integration testing is
 * disabled per the constitution). Covers the read ports ({@code tasksForEmployee} and
 * {@code myTasks}) and the {@code Task -> TaskSummary} mapping, including the optional
 * {@code sourceInteractionId} null/present branch so mutation testing cannot weaken it.
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private TaskService taskService;

    private EmployeeId employeeId;

    @BeforeEach
    void setUp() {
        employeeId = new EmployeeId(1L);
    }

    @Test
    @DisplayName("Should map each task to a summary for a given employee")
    void tasksForEmployee_mapsTasksToSummaries() {
        // Given
        Task task = Task.builder()
                .id(100L)
                .subjectId(1L)
                .sourceInteractionId(42L)
                .title("Test Task")
                .description("Send the email")
                .completed(false)
                .build();
        given(taskRepository.findBySubjectId(employeeId.value()))
                .willReturn(List.of(task));

        // When
        List<TaskSummary> result = taskService.tasksForEmployee(employeeId);

        // Then
        then(taskRepository).should().findBySubjectId(employeeId.value());
        assertThat(result).hasSize(1);
        TaskSummary summary = result.get(0);
        assertThat(summary.id().value()).isEqualTo(100L);
        assertThat(summary.subject().value()).isEqualTo(1L);
        assertThat(summary.title()).isEqualTo("Test Task");
        assertThat(summary.description()).isEqualTo("Send the email");
        assertThat(summary.title()).isNotEqualTo(summary.description());
        assertThat(summary.sourceInteractionId()).isEqualTo(new InteractionId(42L));
        assertThat(summary.completed()).isFalse();
    }

    @Test
    @DisplayName("Should carry a null sourceInteractionId for standalone tasks")
    void tasksForEmployee_carriesNullSourceWhenStandalone() {
        // Given — a task with no source interaction
        Task task = Task.builder()
                .id(102L)
                .subjectId(1L)
                .sourceInteractionId(null)
                .title("Standalone Task")
                .description("Standalone body")
                .completed(true)
                .build();
        given(taskRepository.findBySubjectId(employeeId.value()))
                .willReturn(List.of(task));

        // When
        List<TaskSummary> result = taskService.tasksForEmployee(employeeId);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).sourceInteractionId()).isNull();
        assertThat(result.get(0).completed()).isTrue();
    }

    @Test
    @DisplayName("Should return empty list when no tasks found for employee")
    void tasksForEmployee_returnsEmptyListWhenNoneFound() {
        // Given
        given(taskRepository.findBySubjectId(employeeId.value()))
                .willReturn(Collections.emptyList());

        // When
        List<TaskSummary> result = taskService.tasksForEmployee(employeeId);

        // Then
        then(taskRepository).should().findBySubjectId(employeeId.value());
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Should return my tasks for the current user")
    void myTasks_delegatesToTasksForEmployee() {
        // Given
        Task task = Task.builder()
                .id(101L)
                .subjectId(1L)
                .title("My Task")
                .description("My body")
                .completed(false)
                .build();
        given(taskRepository.findBySubjectId(employeeId.value()))
                .willReturn(List.of(task));

        // When
        List<TaskSummary> result = taskService.myTasks(employeeId);

        // Then
        then(taskRepository).should().findBySubjectId(employeeId.value());
        assertThat(result).hasSize(1);
        assertThat(result.get(0).id().value()).isEqualTo(101L);
        assertThat(result.get(0).completed()).isFalse();
    }

    @Test
    @DisplayName("Should preserve task order from the repository")
    void tasksForEmployee_preservesRepositoryOrder() {
        // Given
        Task first = Task.builder().id(1L).subjectId(1L).title("first").description("first body").completed(false).build();
        Task second = Task.builder().id(2L).subjectId(1L).title("second").description("second body").completed(true).build();
        given(taskRepository.findBySubjectId(employeeId.value()))
                .willReturn(List.of(first, second));

        // When
        List<TaskSummary> result = taskService.tasksForEmployee(employeeId);

        // Then
        assertThat(result).extracting(TaskSummary::title)
                .containsExactly("first", "second");
    }

    @Test
    @DisplayName("Should mark a task completed and stamp completedAt")
    void toggleCompletion_marksCompleted() {
        // Given — an existing, incomplete task
        Task task = Task.builder()
                .id(100L)
                .subjectId(1L)
                .title("Test Task")
                .description("Test body")
                .completed(false)
                .build();
        given(taskRepository.findById(100L)).willReturn(Optional.of(task));
        given(taskRepository.save(task)).willReturn(task);

        // When
        TaskSummary result = taskService.toggleCompletion(100L, true);

        // Then
        then(taskRepository).should().save(task);
        assertThat(task.isCompleted()).isTrue();
        assertThat(task.getCompletedAt()).isNotNull();
        assertThat(result.completed()).isTrue();
    }

    @Test
    @DisplayName("Should reopen a task and clear completedAt")
    void toggleCompletion_reopensAndClearsCompletedAt() {
        // Given — a completed task
        Task task = Task.builder()
                .id(101L)
                .subjectId(1L)
                .title("Done Task")
                .description("Done body")
                .completed(true)
                .build();
        given(taskRepository.findById(101L)).willReturn(Optional.of(task));
        given(taskRepository.save(task)).willReturn(task);

        // When
        TaskSummary result = taskService.toggleCompletion(101L, false);

        // Then
        assertThat(task.isCompleted()).isFalse();
        assertThat(task.getCompletedAt()).isNull();
        assertThat(result.completed()).isFalse();
    }

    @Test
    @DisplayName("Should reject toggling an unknown task")
    void toggleCompletion_rejectsUnknownTask() {
        // Given
        given(taskRepository.findById(404L)).willReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> taskService.toggleCompletion(404L, true))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Task not found: 404");
        then(taskRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("Should update title and description while preserving completion")
    void updateTask_updatesTitleAndDescription() {
        // Given
        Task task = Task.builder()
                .id(100L)
                .subjectId(1L)
                .title("Old title")
                .description("Old body")
                .completed(false)
                .build();
        given(taskRepository.findById(100L)).willReturn(Optional.of(task));
        given(taskRepository.save(task)).willReturn(task);

        // When
        TaskSummary result = taskService.updateTask(100L, "New title", "New body", null);

        // Then
        then(taskRepository).should().save(task);
        assertThat(task.getTitle()).isEqualTo("New title");
        assertThat(task.getDescription()).isEqualTo("New body");
        assertThat(task.isCompleted()).isFalse();
        assertThat(result.title()).isEqualTo("New title");
        assertThat(result.description()).isEqualTo("New body");
    }

    @Test
    @DisplayName("Should update completion without changing title or description")
    void updateTask_updatesCompletionOnly() {
        // Given
        Task task = Task.builder()
                .id(100L)
                .subjectId(1L)
                .title("Title")
                .description("Body")
                .completed(false)
                .build();
        given(taskRepository.findById(100L)).willReturn(Optional.of(task));
        given(taskRepository.save(task)).willReturn(task);

        // When
        TaskSummary result = taskService.updateTask(100L, null, null, true);

        // Then
        assertThat(task.isCompleted()).isTrue();
        assertThat(task.getCompletedAt()).isNotNull();
        assertThat(task.getTitle()).isEqualTo("Title");
        assertThat(task.getDescription()).isEqualTo("Body");
        assertThat(result.completed()).isTrue();
    }

    @Test
    @DisplayName("Should reject updating a task with a blank title")
    void updateTask_rejectsBlankTitle() {
        // Given
        Task task = Task.builder()
                .id(100L)
                .subjectId(1L)
                .title("Title")
                .description("Body")
                .completed(false)
                .build();
        given(taskRepository.findById(100L)).willReturn(Optional.of(task));

        // When / Then
        assertThatThrownBy(() -> taskService.updateTask(100L, "   ", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("title is required");
        then(taskRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("Should reject updating an unknown task")
    void updateTask_rejectsUnknownTask() {
        // Given
        given(taskRepository.findById(404L)).willReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> taskService.updateTask(404L, "Title", "Body", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Task not found: 404");
        then(taskRepository).should(never()).save(any());
    }
}