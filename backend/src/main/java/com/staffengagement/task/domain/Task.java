package com.staffengagement.task.domain;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.shared.kernel.TaskId;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "task")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(name = "source_interaction_id")
    private Long sourceInteractionId;

    @Column(name = "title", nullable = false, length = 255)
    private String title = "";

    @Column(name = "description", nullable = false, length = 1000)
    private String description;

    @Column(name = "completed", nullable = false)
    private boolean completed;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    public TaskId getId() {
        return new TaskId(id);
    }

    public EmployeeId getSubjectId() {
        return new EmployeeId(subjectId);
    }

    public InteractionId getSourceInteractionId() {
        return sourceInteractionId != null ? new InteractionId(sourceInteractionId) : null;
    }
}
