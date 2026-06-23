package com.staffengagement.shared.kernel;

import java.io.Serializable;

/**
 * Typed identifier for a Portfolio.
 *
 * <p>A Portfolio holds a per-employee skills register (years + project count),
 * education, projects, and public links. Phase 4 owns the Portfolio module.
 */
public record PortfolioId(Long value) implements Serializable {
}