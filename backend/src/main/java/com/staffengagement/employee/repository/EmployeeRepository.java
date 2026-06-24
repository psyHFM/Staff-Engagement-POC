package com.staffengagement.employee.repository;

import com.staffengagement.employee.domain.Employee;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Persistence port for the Employee module.
 *
 * <p>The ID type is raw {@code Long} (the typed {@code EmployeeId} is reconstructed at
 * the service boundary). Derived query methods back the frozen
 * {@code EmployeeContract} ({@code findByEmail} for login-time role resolution and
 * identity binding) and the uniqueness check ({@code existsByEmail}). The directory
 * listing ({@code GET /api/v1/employees}) uses the inherited {@link JpaRepository#findAll}
 * with a {@code Pageable}; the offset-based {@code Pageable} adapter lives in this
 * package and is added with the listing task (Group 3/4), so no custom paged method is
 * declared here.
 */
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByEmail(String email);

    boolean existsByEmail(String email);
}