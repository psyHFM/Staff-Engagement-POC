package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import java.util.List;
import java.util.Optional;

/**
 * Frozen cross-module port for the Employee module (Phase 1 implements this).
 *
 * <p>Other modules depend on this interface only — never on the Employee module's
 * implementation, repository, or domain packages (ArchUnit-enforced). {@code findByEmail}
 * was added additively in the Phase 1 shared-kernel coordination PR (ROADMAP §2.2 —
 * coordination PR, additive only; no existing method signature removed or renamed). It
 * is needed at login because the authenticated principal is an email, not an
 * {@link EmployeeId}.
 */
public interface EmployeeContract {

    Optional<EmployeeSummary> findById(EmployeeId id);

    boolean exists(EmployeeId id);

    Optional<EmployeeSummary> findByEmail(String email);

    /**
     * Returns every employee as a summary. Additive contract extension (ROADMAP §2.2)
     * enabling the Phase 5 Skills register to aggregate skill strength across the
     * whole workforce without importing Employee module internals.
     */
    List<EmployeeSummary> allEmployees();
}