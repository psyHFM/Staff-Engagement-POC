package com.staffengagement.task.web;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.InteractionContract;
import com.staffengagement.shared.api.TaskContract;
import com.staffengagement.shared.api.TaskSummary;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for the Task module (Phase 3).
 *
 * <p>URLs follow api-standards.yaml: kebab-case under {@code /api/v1}. The create
 * endpoint lives under {@code /api/v1/tasks}; the read endpoints are person-centric
 * ({@code /api/v1/employees/{id}/tasks} and {@code /api/v1/me/tasks}) and are therefore
 * mapped with absolute paths rather than a class-level base, so all three resolve to
 * their frozen contract paths.
 */
@RestController
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

    @PostMapping("/api/v1/tasks")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<TaskId> create(@RequestBody TaskRequest request) {
        // 2.3 Validation for subject existence via EmployeeContract (skipped only
        // while the employee module is absent).
        EmployeeContract employeeContract = employeeContractProvider.getIfAvailable();
        if (employeeContract != null
                && !employeeContract.exists(new EmployeeId(request.subjectId()))) {
            throw new IllegalArgumentException("Employee not found: " + request.subjectId());
        }

        // 2.4 Validation for sourceInteractionId via the frozen InteractionContract.
        // The contract only exposes findBySubject, so we confirm the supplied
        // interaction belongs to the task's subject — standalone tasks (null source)
        // skip this check.
        if (request.sourceInteractionId() != null) {
            InteractionId sourceId = new InteractionId(request.sourceInteractionId());
            boolean interactionBelongsToSubject = interactionContract
                    .findBySubject(new EmployeeId(request.subjectId()))
                    .stream()
                    .anyMatch(interaction -> interaction.id().equals(sourceId));
            if (!interactionBelongsToSubject) {
                throw new IllegalArgumentException(
                        "Source interaction not found for subject: " + request.sourceInteractionId());
            }
        }

        Task task = Task.builder()
                .subjectId(request.subjectId())
                .sourceInteractionId(request.sourceInteractionId())
                .title(request.title() == null ? "" : request.title())
                .description(request.description())
                .completed(false)
                .build();

        Task saved = taskRepository.save(task);
        return ResponseEntity.ok(saved.getId());
    }

    @PutMapping("/api/v1/tasks/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<TaskSummary> updateCompletion(@PathVariable Long id,
                                                         @RequestBody CompletionRequest request) {
        return ResponseEntity.ok(taskService.toggleCompletion(id, request.completed()));
    }

    @GetMapping("/api/v1/employees/{id}/tasks")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<List<TaskSummary>> getForEmployee(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.tasksForEmployee(new EmployeeId(id)));
    }

    @GetMapping("/api/v1/me/tasks")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<List<TaskSummary>> getMyTasks(@AuthenticationPrincipal UserDetails userDetails) {
        // 2.2 Implement GET /api/v1/me/tasks utilizing the security context to resolve the current employee
        // Assuming the subject in JWT is the Employee ID
        EmployeeId currentEmployeeId = new EmployeeId(Long.parseLong(userDetails.getUsername()));
        return ResponseEntity.ok(taskService.myTasks(currentEmployeeId));
    }

    /**
     * Request body for {@code POST /api/v1/tasks}. ATSE1-31 adds a distinct
     * {@code title} field that is stored on the {@code task.title} column.
     * Bean Validation is wired through the {@code @Valid} annotation that
     * Spring adds implicitly on {@code @RequestBody} for record types in
     * Spring Boot 3.x.
     */
    public record TaskRequest(
            Long subjectId,
            Long sourceInteractionId,
            String title,
            String description) {}

    public record CompletionRequest(boolean completed) {}
}