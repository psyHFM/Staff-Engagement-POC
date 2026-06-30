package com.staffengagement.task.web;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.InteractionContract;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.api.TaskContract;
import com.staffengagement.shared.api.TaskItemSummary;
import com.staffengagement.shared.api.TaskSummary;
import com.staffengagement.shared.api.TaskSummaryWithItems;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.shared.kernel.TaskId;
import com.staffengagement.task.domain.Task;
import com.staffengagement.task.repository.TaskRepository;
import com.staffengagement.task.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * REST endpoints for the Task module (Phase 3).
 *
 * <p>URLs follow api-standards.yaml: kebab-case under {@code /api/v1}. The create
 * endpoint lives under {@code /api/v1/tasks}; the read endpoints are person-centric
 * ({@code /api/v1/employees/{id}/tasks} and {@code /api/v1/me/tasks}).
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final TaskRepository taskRepository;
    // EmployeeContract is optional: the employee module (Phase 1) lands on a
    // parallel splice and may not be present when this module boots. Using an
    // ObjectProvider keeps the monolith bootable on its own (ROADMAP parallel
    // phases), and subject validation activates automatically once the employee
    // module is merged.
    private final ObjectProvider<EmployeeContract> employeeContractProvider;
    private final InteractionContract interactionContract;

    @PostMapping("/tasks")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<TaskSummary> create(@RequestBody TaskRequest request) {
        // When sourceInteractionId is provided, we override the subjectId with the interaction's subject
        Long effectiveSubjectId = request.subjectId();
        Long sourceInteractionId = request.sourceInteractionId();

        if (sourceInteractionId != null) {
            // Fetch the interaction to get its subject
            InteractionId interactionId = new InteractionId(sourceInteractionId);
            Optional<InteractionSummary> interactionOpt = interactionContract
                    .findBySubject(new EmployeeId(request.subjectId()))
                    .stream()
                    .filter(interaction -> interaction.id().equals(interactionId))
                    .findFirst();

            if (interactionOpt.isPresent()) {
                // Override subjectId with the interaction's subject
                effectiveSubjectId = interactionOpt.get().subject().value();
            } else {
                throw new IllegalArgumentException(
                        "Source interaction not found for subject: " + sourceInteractionId);
            }
        }

        // 2.3 Validation for subject existence via EmployeeContract (skipped only
        // while the employee module is absent).
        EmployeeContract employeeContract = employeeContractProvider.getIfAvailable();
        if (employeeContract != null
                && !employeeContract.exists(new EmployeeId(effectiveSubjectId))) {
            throw new IllegalArgumentException("Employee not found: " + effectiveSubjectId);
        }

        Task task = Task.builder()
                .subjectId(effectiveSubjectId)
                .sourceInteractionId(sourceInteractionId)
                .title(request.title() == null ? "" : request.title())
                .description(request.description())
                .completed(false)
                .build();

        Task saved = taskRepository.save(task);
        return ResponseEntity.ok(taskService.toSummary(saved));
    }

    @PutMapping("/tasks/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<TaskSummary> updateCompletion(@PathVariable Long id,
                                                         @RequestBody CompletionRequest request) {
        return ResponseEntity.ok(taskService.toggleCompletion(id, request.completed()));
    }

    @GetMapping("/employees/{id}/tasks")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<List<TaskSummary>> getForEmployee(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.tasksForEmployee(new EmployeeId(id)));
    }

    @GetMapping("/me/tasks")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<List<TaskSummary>> getMyTasks() {
        // 2.2 Implement GET /api/v1/me/tasks utilizing the security context to resolve the current employee
        // Get the authentication from SecurityContextHolder - it's set by JwtAuthFilter
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new IllegalStateException("No authentication found in security context");
        }
        String username = authentication.getName();
        System.out.println("[TaskController] getMyTasks called for username: " + username);
        EmployeeContract employeeContract = employeeContractProvider.getIfAvailable();
        if (employeeContract == null) {
            throw new IllegalStateException("EmployeeContract not available to resolve employeeId");
        }
        return employeeContract.findByEmail(username)
                .map(emp -> {
                    System.out.println("[TaskController] Found employee: " + emp.id().value() + " (" + emp.email() + ")");
                    List<TaskSummary> tasks = taskService.myTasks(emp.id());
                    System.out.println("[TaskController] Found " + tasks.size() + " tasks for employee " + emp.id().value());
                    return ResponseEntity.ok(tasks);
                })
                .orElseThrow(() -> {
                    System.out.println("[TaskController] Employee not found for username: " + username);
                    return new IllegalStateException("Employee not found for username: " + username);
                });
    }

    // --- Task sub-items (ATSE1-34, v1.1.0) ----------------------------------

    /**
     * Returns the task with its sub-items wrapped in a
     * {@link TaskSummaryWithItems}, or 404 if no task with the given id
     * exists.
     */
    @GetMapping("/tasks/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<TaskSummaryWithItems> getWithItems(@PathVariable Long id) {
        return taskService.taskWithItems(new TaskId(id))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Appends a new sub-item to a task's checklist. The ordinal is
     * assigned automatically as {@code max(existing) + 1}.
     */
    @PostMapping("/tasks/{id}/items")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<TaskItemSummary> addItem(@PathVariable Long id,
                                                   @RequestBody ItemRequest request) {
        return ResponseEntity.ok(taskService.addItem(id, request.title()));
    }

    /**
     * Patches an existing sub-item. {@code title} and {@code completed}
     * are optional; null leaves the existing value untouched.
     */
    @PatchMapping("/tasks/{taskId}/items/{itemId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<TaskItemSummary> updateItem(@PathVariable Long taskId,
                                                      @PathVariable Long itemId,
                                                      @RequestBody ItemPatchRequest request) {
        return ResponseEntity.ok(
                taskService.updateItem(taskId, itemId, request.title(), request.completed()));
    }

    /**
     * Removes a sub-item from the task's checklist. The remaining items
     * are re-numbered so ordinals stay contiguous starting at 0.
     */
    @DeleteMapping("/tasks/{taskId}/items/{itemId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Void> deleteItem(@PathVariable Long taskId,
                                            @PathVariable Long itemId) {
        taskService.deleteItem(taskId, itemId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reorders the task's sub-items. The request body is a list of item
     * ids in the desired order; items not present in the list are
     * appended in their existing order.
     */
    @PutMapping("/tasks/{taskId}/items/reorder")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<List<TaskItemSummary>> reorderItems(@PathVariable Long taskId,
                                                               @RequestBody ReorderRequest request) {
        return ResponseEntity.ok(taskService.reorderItems(taskId, request.itemIds()));
    }

    /**
     * Request body for {@code POST /api/v1/tasks}. ATSE1-31 adds a distinct
     * {@code title} field that is stored on the {@code task.title} column.
     * Bean Validation is wired through the {@code @Valid} annotation that
     * Spring adds implicitly on {@code @RequestBody} for record types in
     * Spring Boot 3.x.
     */
    public record TaskRequest(
            @NotBlank
            @Size(max = 120)
            String title,
            Long subjectId,
            Long sourceInteractionId,
            String description) {}

    public record CompletionRequest(boolean completed) {}

    /** Request body for {@code POST /api/v1/tasks/{id}/items}. */
    public record ItemRequest(String title) {}

    /** Request body for {@code PATCH /api/v1/tasks/{taskId}/items/{itemId}}. */
    public record ItemPatchRequest(String title, Boolean completed) {}

    /** Request body for {@code PUT /api/v1/tasks/{taskId}/items/reorder}. */
    public record ReorderRequest(List<Long> itemIds) {}
}