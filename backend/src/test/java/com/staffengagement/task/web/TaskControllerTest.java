package com.staffengagement.task.web;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.InteractionContract;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.api.TaskSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.shared.kernel.InteractionType;
import com.staffengagement.shared.kernel.TaskId;
import com.staffengagement.task.domain.Task;
import com.staffengagement.task.repository.TaskRepository;
import com.staffengagement.task.service.TaskService;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.lenient;

/**
 * BDD unit tests for {@link TaskController} (Phase 3 / testing-strategy.yaml).
 *
 * <p>Mockito-only — the controller methods are invoked directly with mocked ports, so no
 * Spring/WebMvc slice (integration testing is disabled per the constitution). Covers the
 * create-validation path and the read endpoints, giving mutation testing a grip on the
 * controller logic.
 */
@ExtendWith(MockitoExtension.class)
class TaskControllerTest {

    @Mock
    private TaskService taskService;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private EmployeeContract employeeContract;
    @Mock
    private ObjectProvider<EmployeeContract> employeeContractProvider;
    @Mock
    private InteractionContract interactionContract;

    @InjectMocks
    private TaskController controller;

    private EmployeeId subject;

    @BeforeEach
    void setUp() {
        subject = new EmployeeId(1L);
        // Controller resolves EmployeeContract via an ObjectProvider (optional
        // dependency). Surface the mock contract so the create-validation paths
        // are exercised; lenient because not every test calls create().
        lenient().when(employeeContractProvider.getIfAvailable()).thenReturn(employeeContract);
    }

    @Test
    @DisplayName("Should persist and return the new task id when the subject exists")
    void create_persistsAndReturnsId_whenSubjectExists() {
        // Given — the subject exists and the source interaction belongs to them
        TaskController.TaskRequest request = new TaskController.TaskRequest(1L, 42L, "Follow up", "Send the email");
        given(employeeContract.exists(new EmployeeId(1L))).willReturn(true);
        given(interactionContract.findBySubject(new EmployeeId(1L)))
                .willReturn(List.of(new InteractionSummary(
                        new InteractionId(42L), InteractionType.CHECK_IN,
                        new EmployeeId(1L), new EmployeeId(2L), "Facilitator Name", "subject", "note",
                        Instant.parse("2026-06-25T10:00:00Z"))));
        Task persisted = Task.builder()
                .id(777L)
                .subjectId(1L)
                .sourceInteractionId(42L)
                .title("Follow up")
                .description("Send the email")
                .completed(false)
                .build();
        given(taskRepository.save(any(Task.class))).willReturn(persisted);

        // When
        ResponseEntity<TaskId> response = controller.create(request);

        // Then
        then(employeeContract).should().exists(new EmployeeId(1L));
        then(interactionContract).should().findBySubject(new EmployeeId(1L));
        then(taskRepository).should().save(any(Task.class));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(new TaskId(777L));
    }

    @Test
    @DisplayName("Should create a standalone task when no source interaction is supplied")
    void create_allowsStandaloneTask_withoutInteractionCheck() {
        // Given — no sourceInteractionId, so interaction validation is skipped
        TaskController.TaskRequest request = new TaskController.TaskRequest(1L, null, "Standalone", "Standalone");
        given(employeeContract.exists(new EmployeeId(1L))).willReturn(true);
        Task persisted = Task.builder()
                .id(5L)
                .subjectId(1L)
                .title("Standalone")
                .description("Standalone")
                .completed(false)
                .build();
        given(taskRepository.save(any(Task.class))).willReturn(persisted);

        // When
        ResponseEntity<TaskId> response = controller.create(request);

        // Then
        then(interactionContract).shouldHaveNoInteractions();
        assertThat(response.getBody()).isEqualTo(new TaskId(5L));
    }

    @Test
    @DisplayName("Should reject creation when the subject employee does not exist")
    void create_rejects_whenSubjectMissing() {
        // Given
        TaskController.TaskRequest request = new TaskController.TaskRequest(99L, null, "Orphan", "Orphan body");
        given(employeeContract.exists(new EmployeeId(99L))).willReturn(false);

        // When / Then
        assertThatThrownBy(() -> controller.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Employee not found: 99");
        then(interactionContract).shouldHaveNoInteractions();
        then(taskRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("Should reject creation when the source interaction does not belong to the subject")
    void create_rejects_whenSourceInteractionNotForSubject() {
        // Given — the subject has interaction 42, but the request references 99
        TaskController.TaskRequest request = new TaskController.TaskRequest(1L, 99L, "From interaction", "Body");
        given(employeeContract.exists(new EmployeeId(1L))).willReturn(true);
        given(interactionContract.findBySubject(new EmployeeId(1L)))
                .willReturn(List.of(new InteractionSummary(
                        new InteractionId(42L), InteractionType.CHECK_IN,
                        new EmployeeId(1L), new EmployeeId(2L), "Facilitator Name", "subject", "note",
                        Instant.parse("2026-06-25T10:00:00Z"))));

        // When / Then
        assertThatThrownBy(() -> controller.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Source interaction not found for subject: 99");
        then(taskRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("Should toggle a task's completion via the service")
    void updateCompletion_delegatesToService() {
        // Given
        TaskSummary summary = new TaskSummary(
                new TaskId(10L), subject, "Read", new InteractionId(42L), true, "Read");
        given(taskService.toggleCompletion(10L, true)).willReturn(summary);

        // When
        ResponseEntity<TaskSummary> response =
                controller.updateCompletion(10L, new TaskController.CompletionRequest(true));

        // Then
        then(taskService).should().toggleCompletion(10L, true);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(summary);
    }

    @Test
    @DisplayName("Should return tasks for the requested employee id")
    void getForEmployee_delegatesToService() {
        // Given
        TaskSummary summary = new TaskSummary(
                new TaskId(10L), subject, "Read", new InteractionId(42L), false, "Read design doc");
        given(taskService.tasksForEmployee(subject)).willReturn(List.of(summary));

        // When
        ResponseEntity<List<TaskSummary>> response = controller.getForEmployee(1L);

        // Then
        then(taskService).should().tasksForEmployee(subject);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly(summary);
    }

    @Test
    @DisplayName("Should resolve the current employee from the security context")
    void getMyTasks_resolvesCurrentEmployeeFromPrincipal() {
        // Given
        UserDetails principal = org.mockito.Mockito.mock(UserDetails.class);
        given(principal.getUsername()).willReturn("7");
        TaskSummary summary = new TaskSummary(
                new TaskId(11L), new EmployeeId(7L), "Mine", null, true, "Mine");
        given(taskService.myTasks(new EmployeeId(7L))).willReturn(List.of(summary));

        // When
        ResponseEntity<List<TaskSummary>> response = controller.getMyTasks(principal);

        // Then
        then(taskService).should().myTasks(new EmployeeId(7L));
        assertThat(response.getBody()).containsExactly(summary);
    }
}