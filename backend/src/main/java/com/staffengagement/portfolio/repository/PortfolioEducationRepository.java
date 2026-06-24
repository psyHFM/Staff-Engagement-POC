package com.staffengagement.portfolio.repository;

import com.staffengagement.portfolio.domain.PortfolioEducation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for {@link PortfolioEducation} entries.
 */
@Repository
public interface PortfolioEducationRepository extends JpaRepository<PortfolioEducation, Long> {

    List<PortfolioEducation> findByPortfolioId(Long portfolioId);

    void deleteByPortfolioId(Long portfolioId);
}