package com.staffengagement.portfolio.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * A skill entry in a portfolio — the unit the Skills register (Phase 5) aggregates.
 * Carries a non-negative {@code years} and {@code projectCount} (validated in the
 * service layer before persistence).
 */
@Entity
@Table(name = "portfolio_skill")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "portfolio_id", nullable = false)
    private Long portfolioId;

    @Column(name = "skill", nullable = false, length = 255)
    private String skill;

    @Column(name = "years", nullable = false)
    private int years;

    @Column(name = "project_count", nullable = false)
    private int projectCount;
}