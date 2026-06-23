package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;

/**
 * Frozen cross-module port for the Portfolio module (Phase 4 implements this).
 *
 * <p>Returns a per-employee portfolio summary including skill entries (years + project
 * count) that the Skills register (Phase 5) aggregates.
 */
public interface PortfolioContract {

    PortfolioSummary portfolioFor(EmployeeId employeeId);
}