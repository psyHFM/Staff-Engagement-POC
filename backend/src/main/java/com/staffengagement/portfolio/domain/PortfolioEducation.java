package com.staffengagement.portfolio.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * An education history entry in a portfolio (institution, qualification, optional
 * start/end years).
 */
@Entity
@Table(name = "portfolio_education")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioEducation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "portfolio_id", nullable = false)
    private Long portfolioId;

    @Column(name = "institution", nullable = false, length = 255)
    private String institution;

    @Column(name = "qualification", length = 255)
    private String qualification;

    @Column(name = "start_year")
    private Integer startYear;

    @Column(name = "end_year")
    private Integer endYear;
}