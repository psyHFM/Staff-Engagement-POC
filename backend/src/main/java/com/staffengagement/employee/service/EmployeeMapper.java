package com.staffengagement.employee.service;

import com.staffengagement.employee.domain.Employee;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.kernel.EmployeeId;

/**
 * Maps the persistence entity to the read models: the frozen 4-field
 * {@link EmployeeSummary} (for cross-module consumers and the contract) and the
 * full-field {@link EmployeeResponse} (for this module's own endpoints). Typed IDs are
 * reconstructed from the raw {@code Long} at this boundary. Stateless and package-local
 * in scope of use; kept as a distinct class (rather than inline methods on the service)
 * per the Phase 1 task spec.
 */
final class EmployeeMapper {

    private EmployeeMapper() {
    }

    static EmployeeSummary toSummary(Employee entity) {
        return new EmployeeSummary(
                new EmployeeId(entity.getId()),
                entity.getFullName(),
                entity.getEmail(),
                entity.getRole(),
                entity.getJobTitle(),
                entity.getDepartment(),
                entity.getLevel() != null ? entity.getLevel().name().toLowerCase() : null);
    }

    static EmployeeResponse toResponse(Employee entity) {
        return new EmployeeResponse(
                new EmployeeId(entity.getId()),
                entity.getFullName(),
                entity.getEmail(),
                entity.getRole(),
                entity.getJobTitle(),
                entity.getDepartment(),
                entity.getLevel(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}