package com.staffengagement.employee.domain;

import com.staffengagement.shared.kernel.EmployeeRole;
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
 * Anemic JPA entity for an Employee — the central record that Interaction (Phase 2),
 * Task (Phase 3), Portfolio (Phase 4), and Skills (Phase 5) reference via the frozen
 * {@code EmployeeContract} (ROADMAP §4 / MISSION v1.1.0). Carries no behaviour; all
 * logic lives in {@code EmployeeService}.
 *
 * <p>Persistence uses a raw {@code Long} for the {@code id}; the typed
 * {@code EmployeeId} from {@code shared/kernel} is reconstructed at the service
 * boundary so the frozen {@link com.staffengagement.shared.api.EmployeeSummary}
 * contract stays module-agnostic. {@code role} is stored as the {@link EmployeeRole}
 * enum name via {@link EnumType#STRING} (the JSON wire name {@code employee}/{@code
 * admin} is handled at the API boundary by the {@code @JsonProperty} on the enum,
 * not here). {@code level} is the module-local {@link EmployeeLevel} enum, likewise
 * stored as its name. {@code email} is the immutable identity key (unique at the DB
 * level); {@code createdAt}/{@code updatedAt} are set by the service.
 *
 * <p>Lombok: {@code @Getter}/{@code @Setter} + {@code @NoArgsConstructor} (JPA requires
 * the no-arg constructor). {@code @Data} is deliberately avoided per the backend
 * persona (problematic {@code equals}/{@code hashCode}/{@code toString} on lazy
 * associations). There is no {@code active}/soft-delete flag (a Phase 1 non-goal).
 */
@Entity
@Table(name = "employee")
@Getter
@Setter
@NoArgsConstructor
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 32)
    private EmployeeRole role;

    @Column(name = "job_title", length = 255)
    private String jobTitle;

    @Column(name = "department", length = 255)
    private String department;

    @Enumerated(EnumType.STRING)
    @Column(name = "level", length = 32)
    private EmployeeLevel level;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}