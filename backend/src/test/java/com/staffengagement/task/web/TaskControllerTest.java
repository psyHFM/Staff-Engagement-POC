package com.staffengagement.task.web;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.InteractionContract;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.api.TaskItemSummary;
import com.staffengagement.shared.api.TaskSummary;
import com.staffengagement.shared.api.TaskSummaryWithItems;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

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
        // Clear security context for each test
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Should persist and return the new task id when the subject exists")
    void create_persistsAndReturnsId_whenSubjectExists() {
        // Given — the subject exists and the source interaction belongs to them
        TaskController.TaskRequest request = new TaskController.TaskRequest("Follow up", 1L, 42L, "Send the email");
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
        given(taskService.toSummary(any(Task.class))).willReturn(new TaskSummary(
                new TaskId(777L), new EmployeeId(1L), "Follow up", new InteractionId(42L), false, "Send the email", Instant.now()));

        // When
        ResponseEntity<TaskSummary> response = controller.create(request);

        // Then
        then(employeeContract).shouldHaveNoInteractions();
        then(interactionContract).should().findBySubject(new EmployeeId(1L));
        then(taskRepository).should().save(any(Task.class));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().id()).isEqualTo(new TaskId(777L));
    }

    @Test
    @DisplayName("Should create a standalone task when no source interaction is supplied")
    void create_allowsStandaloneTask_withoutInteractionCheck() {
        // Given — no sourceInteractionId, so interaction validation is skipped
        TaskController.TaskRequest request = new TaskController.TaskRequest("Standalone", 1L, null, "Standalone");
        given(employeeContract.exists(new EmployeeId(1L))).willReturn(true);
        Task persisted = Task.builder()
                .id(5L)
                .subjectId(1L)
                .title("Standalone")
                .description("Standalone")
                .completed(false)
                .build();
        given(taskRepository.save(any(Task.class))).willReturn(persisted);
        given(taskService.toSummary(any(Task.class))).willReturn(new TaskSummary(
                new TaskId(5L), new EmployeeId(1L), "Standalone", null, false, "Standalone", Instant.now()));

        // When
        ResponseEntity<TaskSummary> response = controller.create(request);

        // Then
        then(interactionContract).shouldHaveNoInteractions();
        assertThat(response.getBody().id()).isEqualTo(new TaskId(5L));
    }

    @Test
    @DisplayName("Should reject creation when the subject employee does not exist")
    void create_rejects_whenSubjectMissing() {
        // Given
        TaskController.TaskRequest request = new TaskController.TaskRequest("Orphan", 99L, null, "Orphan body");
        given(employeeContract.exists(new EmployeeId(99L))).willReturn(false);

        // When / Then
        assertThatThrownBy(() -> controller.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Employee not found: 99");
        then(interactionContract).shouldHaveNoInteractions();
        then(taskRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("Should create task with subject from interaction when source interaction is provided")
    void create_usesSubjectFromInteraction_whenSourceInteractionProvided() {
        // Given — request has subjectId 1, and interaction belongs to subject 1
        TaskController.TaskRequest request = new TaskController.TaskRequest("From interaction", 1L, 42L, "Body");
        given(interactionContract.findBySubject(new EmployeeId(1L)))
                .willReturn(List.of(new InteractionSummary(
                        new InteractionId(42L), InteractionType.CHECK_IN,
                        new EmployeeId(1L), new EmployeeId(2L), "Facilitator Name", "subject", "note",
                        Instant.parse("2026-06-25T10:00:00Z"))));
        Task persisted = Task.builder()
                .id(777L)
                .subjectId(1L) // Should use interaction's subject
                .sourceInteractionId(42L)
                .title("From interaction")
                .description("Body")
                .completed(false)
                .build();
        given(taskRepository.save(any(Task.class))).willReturn(persisted);
        given(taskService.toSummary(any(Task.class))).willReturn(new TaskSummary(
                new TaskId(777L), new EmployeeId(1L), "From interaction", new InteractionId(42L), false, "Body", Instant.now()));

        // When
        ResponseEntity<TaskSummary> response = controller.create(request);

        // Then
        then(employeeContract).shouldHaveNoInteractions();
        then(interactionContract).should().findBySubject(new EmployeeId(1L));
        then(taskRepository).should().save(any(Task.class));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().subject().value()).isEqualTo(1L); // Should be interaction's subject
        assertThat(response.getBody().sourceInteractionId()).isEqualTo(new InteractionId(42L));
    }

    @Test
    @DisplayName("Should reject creation when the source interaction does not belong to the subject")
    void create_rejects_whenSourceInteractionNotForSubject() {
        // Given — the subject has interaction 42, but the request references 99
        TaskController.TaskRequest request = new TaskController.TaskRequest("From interaction", 1L, 99L, "Body");
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
    @DisplayName("Should update a task's completion via the service")
    void updateTask_updatesCompletion_whenCompletedProvided() {
        // Given
        TaskSummary summary = new TaskSummary(
                new TaskId(10L), subject, "Read", new InteractionId(42L), true, "Read", Instant.now());
        given(taskService.updateTask(10L, null, null, true)).willReturn(summary);

        // When
        ResponseEntity<TaskSummary> response =
                controller.updateTask(10L, new TaskController.TaskUpdateRequest(null, null, true));

        // Then
        then(taskService).should().updateTask(10L, null, null, true);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(summary);
    }

    @Test
    @DisplayName("Should update a task's title and description via the service")
    void updateTask_updatesTitleAndDescription_whenProvided() {
        // Given
        TaskSummary summary = new TaskSummary(
                new TaskId(10L), subject, "Updated title", new InteractionId(42L), false, "Updated body", Instant.now());
        given(taskService.updateTask(10L, "Updated title", "Updated body", null)).willReturn(summary);

        // When
        ResponseEntity<TaskSummary> response = controller.updateTask(
                10L, new TaskController.TaskUpdateRequest("Updated title", "Updated body", null));

        // Then
        then(taskService).should().updateTask(10L, "Updated title", "Updated body", null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(summary);
    }

    @Test
    @DisplayName("Should delegate a full task update to the service")
    void updateTask_delegatesAllFields_whenAllProvided() {
        // Given
        TaskSummary summary = new TaskSummary(
                new TaskId(10L), subject, "All fields", new InteractionId(42L), true, "All body", Instant.now());
        given(taskService.updateTask(10L, "All fields", "All body", true)).willReturn(summary);

        // When
        ResponseEntity<TaskSummary> response = controller.updateTask(
                10L, new TaskController.TaskUpdateRequest("All fields", "All body", true));

        // Then
        then(taskService).should().updateTask(10L, "All fields", "All body", true);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(summary);
    }

    @Test
    @DisplayName("Should return tasks for the requested employee id")
    void getForEmployee_delegatesToService() {
        // Given
        TaskSummary summary = new TaskSummary(
                new TaskId(10L), subject, "Read", new InteractionId(42L), false, "Read design doc", Instant.now());
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
        // Given - Set the authentication in the security context (simulating JwtAuthFilter)
        Authentication auth = new UsernamePasswordAuthenticationToken("test@staff.eng", null);
        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(auth);
        SecurityContextHolder.setContext(securityContext);

        EmployeeSummary emp = new EmployeeSummary(new EmployeeId(7L), "Test User", "test@staff.eng", EmployeeRole.EMPLOYEE, "Engineer", "Eng", "JUNIOR");
        given(employeeContract.findByEmail("test@staff.eng")).willReturn(Optional.of(emp));
        TaskSummary summary = new TaskSummary(
                new TaskId(11L), new EmployeeId(7L), "Mine", null, true, "Mine", Instant.now());
        given(taskService.myTasks(new EmployeeId(7L))).willReturn(List.of(summary));

        // When - Call without arguments (authentication comes from SecurityContext)
        ResponseEntity<List<TaskSummary>> response = controller.getMyTasks();

        // Then
        then(taskService).should().myTasks(new EmployeeId(7L));
        assertThat(response.getBody()).containsExactly(summary);
    }

    @Test
    @DisplayName("Should return task with items when task exists")
    void getWithItems_shouldReturnTaskWithItems_whenTaskExists() {
        // Given
        TaskId taskId = new TaskId(10L);
        TaskSummary summary = new TaskSummary(taskId, subject, "Task Title", null, false, "Description", Instant.now());
        TaskItemSummary item1 = new TaskItemSummary(1L, taskId, 0, "Item 1", false, Instant.now());
        TaskItemSummary item2 = new TaskItemSummary(2L, taskId, 1, "Item 2", true, Instant.now());
        TaskSummaryWithItems taskWithItems = new TaskSummaryWithItems(summary, List.of(item1, item2));

        given(taskService.taskWithItems(taskId)).willReturn(Optional.of(taskWithItems));

        // When
        ResponseEntity<TaskSummaryWithItems> response = controller.getWithItems(10L);

        // Then
        then(taskService).should().taskWithItems(taskId);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(taskWithItems);
    }

    @Test
    @DisplayName("Should return 404 when task with items not found")
    void getWithItems_shouldReturn404_whenTaskNotFound() {
        // Given
        TaskId taskId = new TaskId(999L);
        given(taskService.taskWithItems(taskId)).willReturn(Optional.empty());

        // When
        ResponseEntity<TaskSummaryWithItems> response = controller.getWithItems(999L);

        // Then
        then(taskService).should().taskWithItems(taskId);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Should add item to task checklist")
    void addItem_shouldAddItemToList() {
        // Given
        TaskItemSummary newItem = new TaskItemSummary(
                5L, new TaskId(10L), 2, "New Item", false, Instant.now());
        TaskController.ItemRequest request = new TaskController.ItemRequest("New Item");

        given(taskService.addItem(10L, "New Item")).willReturn(newItem);

        // When
        ResponseEntity<TaskItemSummary> response = controller.addItem(10L, request);

        // Then
        then(taskService).should().addItem(10L, "New Item");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(newItem);
    }

    @Test
    @DisplayName("Should update item title and completed status")
    void updateItem_shouldPatchItemFields() {
        // Given
        TaskItemSummary updatedItem = new TaskItemSummary(
                5L, new TaskId(10L), 1, "Updated Title", true, Instant.now());
        TaskController.ItemPatchRequest request = new TaskController.ItemPatchRequest("Updated Title", true);

        given(taskService.updateItem(10L, 5L, "Updated Title", true)).willReturn(updatedItem);

        // When
        ResponseEntity<TaskItemSummary> response = controller.updateItem(10L, 5L, request);

        // Then
        then(taskService).should().updateItem(10L, 5L, "Updated Title", true);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(updatedItem);
    }

    @Test
    @DisplayName("Should update only item title when completed is null")
    void updateItem_shouldPatchOnlyTitle_whenCompletedIsNull() {
        // Given
        TaskItemSummary updatedItem = new TaskItemSummary(
                5L, new TaskId(10L), 1, "Title Only", false, Instant.now());
        TaskController.ItemPatchRequest request = new TaskController.ItemPatchRequest("Title Only", null);

        given(taskService.updateItem(10L, 5L, "Title Only", null)).willReturn(updatedItem);

        // When
        ResponseEntity<TaskItemSummary> response = controller.updateItem(10L, 5L, request);

        // Then
        then(taskService).should().updateItem(10L, 5L, "Title Only", null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("Should delete item from task checklist")
    void deleteItem_shouldRemoveItemFromList() {
        // When
        ResponseEntity<Void> response = controller.deleteItem(10L, 5L);

        // Then
        then(taskService).should().deleteItem(10L, 5L);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    @DisplayName("Should reorder items based on provided itemIds")
    void reorderItems_shouldReorderItemsByProvidedIds() {
        // Given
        List<Long> itemIds = List.of(3L, 1L, 2L);
        TaskController.ReorderRequest request = new TaskController.ReorderRequest(itemIds);
        TaskItemSummary item1 = new TaskItemSummary(1L, new TaskId(10L), 0, "First", false, Instant.now());
        TaskItemSummary item2 = new TaskItemSummary(2L, new TaskId(10L), 1, "Second", false, Instant.now());
        TaskItemSummary item3 = new TaskItemSummary(3L, new TaskId(10L), 2, "Third", false, Instant.now());
        List<TaskItemSummary> reordered = List.of(item3, item1, item2);

        given(taskService.reorderItems(10L, itemIds)).willReturn(reordered);

        // When
        ResponseEntity<List<TaskItemSummary>> response = controller.reorderItems(10L, request);

        // Then
        then(taskService).should().reorderItems(10L, itemIds);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(reordered);
    }

    @Test
    @DisplayName("Should update task completion via toggleCompletion")
    void updateCompletion_shouldToggleCompletion() {
        // Given
        TaskSummary completedSummary = new TaskSummary(
                new TaskId(10L), subject, "Task", null, true, "Description", Instant.now());
        TaskController.CompletionRequest request = new TaskController.CompletionRequest(true);

        given(taskService.toggleCompletion(10L, true)).willReturn(completedSummary);

        // When
        ResponseEntity<TaskSummary> response = controller.updateCompletion(10L, request);

        // Then
        then(taskService).should().toggleCompletion(10L, true);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(completedSummary);
    }

    @Test
    @DisplayName("Should mark task as not completed when completed is false")
    void updateCompletion_shouldMarkTaskAsNotCompleted() {
        // Given
        TaskSummary notCompletedSummary = new TaskSummary(
                new TaskId(10L), subject, "Task", null, false, "Description", Instant.now());
        TaskController.CompletionRequest request = new TaskController.CompletionRequest(false);

        given(taskService.toggleCompletion(10L, false)).willReturn(notCompletedSummary);

        // When
        ResponseEntity<TaskSummary> response = controller.updateCompletion(10L, request);

        // Then
        then(taskService).should().toggleCompletion(10L, false);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().completed()).isFalse();
    }
}