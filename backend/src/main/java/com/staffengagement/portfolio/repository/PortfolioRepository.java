package com.staffengagement.portfolio.repository;

import com.staffengagement.portfolio.domain.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for the {@link Portfolio} aggregate root. No cross-module repository
 * imports (ArchUnit-enforced).
 */
@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {

    Optional<Portfolio> findByEmployeeId(Long employeeId);

    boolean existsByEmployeeId(Long employeeId);
}