package com.staffengagement.portfolio.repository;

import com.staffengagement.portfolio.domain.PortfolioProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for {@link PortfolioProject} entries.
 */
@Repository
public interface PortfolioProjectRepository extends JpaRepository<PortfolioProject, Long> {

    List<PortfolioProject> findByPortfolioId(Long portfolioId);

    void deleteByPortfolioId(Long portfolioId);
}