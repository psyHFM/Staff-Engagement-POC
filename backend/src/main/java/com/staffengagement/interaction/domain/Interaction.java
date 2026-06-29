package com.staffengagement.interaction.domain;

import com.staffengagement.shared.kernel.InteractionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Anemic JPA entity for an Interaction — a typed engagement recorded against an
 * employee (ROADMAP §5 / MISSION v1.1.0). Carries no behaviour; all logic lives in
 * {@code InteractionService}.
 *
 * <p>Persistence uses raw {@code Long} for the {@code id} and the two
 * {@code EmployeeId} references (subject + facilitator); the typed IDs from
 * {@code shared/kernel} are reconstructed at the service boundary so the frozen
 * {@link com.staffengagement.shared.api.InteractionSummary} contract stays
 * module-agnostic. {@code type} is stored as the {@link InteractionType} enum
 * name via {@link EnumType#STRING} (the JSON wire name {@code check-in} etc. is
 * handled at the API boundary by the frozen {@code @JsonProperty} on the enum,
 * not here). No DB-level FK to an {@code employee} table — referential integrity
 * is enforced in the service layer via {@code EmployeeContract.exists}.
 *
 * <p>Lombok: {@code @Getter}/{@code @Setter} + {@code @NoArgsConstructor} (JPA
 * requires the no-arg constructor). {@code @Data} is deliberately avoided per
 * the backend persona (problematic {@code equals}/{@code hashCode}/{@code
 * toString} on lazy associations).
 */
@Entity
@Table(name = "interaction")
@Getter
@Setter
@NoArgsConstructor
public class Interaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 32)
    private InteractionType type;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Column(name = "facilitator_id", nullable = false)
    private Long facilitatorId;

    @Column(name = "subject_text", length = 100)
    private String subjectText;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}