package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import java.util.Optional;

/**
 * Frozen cross-module port for the Employee module (Phase 1 implements this).
 *
 * <p>Other modules depend on this interface only — never on the Employee module's
 * implementation, repository, or domain packages (ArchUnit-enforced).
 */
public interface EmployeeContract {

    Optional<EmployeeSummary> findById(EmployeeId id);

    boolean exists(EmployeeId id);
}