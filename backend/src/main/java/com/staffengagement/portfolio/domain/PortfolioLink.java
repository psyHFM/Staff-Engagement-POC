package com.staffengagement.portfolio.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * A public link in a portfolio (optional label, required url — e.g. a GitHub profile
 * or anything the employee wants to showcase).
 */
@Entity
@Table(name = "portfolio_link")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "portfolio_id", nullable = false)
    private Long portfolioId;

    @Column(name = "label", length = 255)
    private String label;

    @Column(name = "url", nullable = false, length = 2048)
    private String url;
}