package com.staffengagement.task.web;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.InteractionContract;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.task.domain.Task;
import com.staffengagement.task.repository.TaskRepository;
import com.staffengagement.task.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.lenient;

/**
 * BDD unit tests for the ATSE1-31 security fix (§7.7).
 *
 * <p>Before the fix every TaskController endpoint was annotated
 * {@code @PreAuthorize("hasRole('USER')")} — which rejected the
 * seeded admin user. The fix is to switch to
 * {@code hasAnyRole('USER','ADMIN')}.
 *
 * <p>These tests verify two things:
 * <ol>
 *   <li>The annotation literal carries {@code hasAnyRole('USER','ADMIN')}
 *       (and NOT {@code hasRole('USER')}). This is the static check.</li>
 *   <li>The controller body writes {@code request.title} into the new
 *       {@code task.title} column — the runtime check.</li>
 * </ol>
 *
 * <p>Mockito-only (no Spring AOP context — integration testing is
 * disabled per the constitution).
 */
@ExtendWith(MockitoExtension.class)
class TaskControllerSecurityTest {

    @Mock private TaskService taskService;
    @Mock private TaskRepository taskRepository;
    @Mock private EmployeeContract employeeContract;
    @Mock private ObjectProvider<EmployeeContract> employeeContractProvider;
    @Mock private InteractionContract interactionContract;

    @InjectMocks private TaskController controller;

    @Captor private ArgumentCaptor<Task> taskCaptor;

    @BeforeEach
    void setUp() {
        lenient().when(employeeContractProvider.getIfAvailable()).thenReturn(employeeContract);
    }

    // --- Annotation static check (§7.7) --------------------------------------

    @Test
    @DisplayName("create() must allow USER and ADMIN via hasAnyRole (seeded admin fix)")
    void create_annotationAcceptsAdminAndUser() throws Exception {
        Method method = TaskController.class.getMethod(
                "create", TaskController.TaskRequest.class);
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);

        assertThat(annotation).isNotNull();
        assertThat(annotation.value())
                .as("ATSE1-31: admin@staff.eng must be able to create tasks")
                .isEqualTo("hasAnyRole('USER','ADMIN')");
        assertThat(annotation.value())
                .as("must NOT regress to the single-role gate")
                .doesNotContain("hasRole('USER')");
    }

    @Test
    @DisplayName("updateCompletion() must accept USER and ADMIN")
    void updateCompletion_annotationAcceptsAdminAndUser() throws Exception {
        Method method = TaskController.class.getMethod(
                "updateCompletion", Long.class, TaskController.CompletionRequest.class);
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);

        assertThat(annotation).isNotNull();
        assertThat(annotation.value()).isEqualTo("hasAnyRole('USER','ADMIN')");
    }

    @Test
    @DisplayName("getForEmployee() must accept USER and ADMIN")
    void getForEmployee_annotationAcceptsAdminAndUser() throws Exception {
        Method method = TaskController.class.getMethod("getForEmployee", Long.class);
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);

        assertThat(annotation).isNotNull();
        assertThat(annotation.value()).isEqualTo("hasAnyRole('USER','ADMIN')");
    }

    @Test
    @DisplayName("getMyTasks() must accept USER and ADMIN")
    void getMyTasks_annotationAcceptsAdminAndUser() throws Exception {
        Method method = TaskController.class.getMethod("getMyTasks");
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);

        assertThat(annotation).isNotNull();
        assertThat(annotation.value()).isEqualTo("hasAnyRole('USER','ADMIN')");
    }

    // --- request.title wires into the entity (§7.4 + §7.6) -------------------

    @Test
    @DisplayName("create() persists request.title on the new task entity")
    void create_persistsTitleOnEntity() {
        // Given — a request whose title and description are distinct
        TaskController.TaskRequest request =
                new TaskController.TaskRequest("Follow up", 1L, null, "Send the email");
        given(employeeContract.exists(new EmployeeId(1L))).willReturn(true);
        given(taskRepository.save(org.mockito.ArgumentMatchers.any(Task.class)))
                .willAnswer(inv -> {
                    Task t = inv.getArgument(0);
                    t.setId(42L);
                    return t;
                });

        // When
        ResponseEntity<com.staffengagement.shared.api.TaskSummary> response =
                controller.create(request);

        // Then — the entity carried title="Follow up", description="Send the email"
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        then(taskRepository).should().save(taskCaptor.capture());
        Task saved = taskCaptor.getValue();
        assertThat(saved.getTitle()).isEqualTo("Follow up");
        assertThat(saved.getDescription()).isEqualTo("Send the email");
        // The §7.5 regression test — title must NOT mirror description
        assertThat(saved.getTitle()).isNotEqualTo(saved.getDescription());
    }

    @Test
    @DisplayName("create() coerces a null title to an empty string (NOT NULL DEFAULT '')")
    void create_nullTitleIsCoercedToEmptyString() {
        // Given — request with explicit null title
        TaskController.TaskRequest request =
                new TaskController.TaskRequest(null, 1L, null, "Body");
        given(employeeContract.exists(new EmployeeId(1L))).willReturn(true);
        given(taskRepository.save(org.mockito.ArgumentMatchers.any(Task.class)))
                .willAnswer(inv -> {
                    Task t = inv.getArgument(0);
                    t.setId(43L);
                    return t;
                });

        // When
        controller.create(request);

        // Then — title was coerced to ""
        then(taskRepository).should().save(taskCaptor.capture());
        assertThat(taskCaptor.getValue().getTitle()).isEqualTo("");
    }

    @Test
    @DisplayName("create() rejects unknown subject without persisting (admin role guard works)")
    void create_rejectsUnknownSubject() {
        // Given — admin token, but the supplied subject does not exist
        TaskController.TaskRequest request =
                new TaskController.TaskRequest("Orphan", 99L, null, "Body");
        given(employeeContract.exists(new EmployeeId(99L))).willReturn(false);

        // When / Then — illegal argument bubbles up; no save happens
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> controller.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Employee not found: 99");
        then(taskRepository).shouldHaveNoInteractions();
    }

    // --- Sanity: list-style query returns through the read pipeline ----------

    @Test
    @DisplayName("getForEmployee() delegates to the service regardless of the role gate")
    void getForEmployee_delegatesToService() {
        // Given
        given(taskService.tasksForEmployee(new EmployeeId(1L))).willReturn(Collections.emptyList());

        // When
        ResponseEntity<List<com.staffengagement.shared.api.TaskSummary>> response =
                controller.getForEmployee(1L);

        // Then — admin or user, both reach the service
        then(taskService).should().tasksForEmployee(new EmployeeId(1L));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }
}
