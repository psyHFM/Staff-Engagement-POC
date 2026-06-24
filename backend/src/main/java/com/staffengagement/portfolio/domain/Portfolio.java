package com.staffengagement.portfolio.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * Aggregate root for a per-employee portfolio (Phase 4). 1:1 with Employee — the
 * {@code employee_id} column carries a unique constraint (enforced in Liquibase).
 *
 * <p>Anemic domain model per {@code backend-architecture.yaml}: carries no behaviour;
 * all logic lives in {@code PortfolioService}. The {@code id} / {@code employee_id}
 * columns are exposed as raw {@code Long} getters (the service works in raw ids and
 * wraps to {@code EmployeeId} only at the frozen-contract boundary); child entities
 * reference this row via {@code portfolio_id}.
 */
@Entity
@Table(name = "portfolio")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Portfolio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "employee_id", nullable = false, unique = true)
    private Long employeeId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}