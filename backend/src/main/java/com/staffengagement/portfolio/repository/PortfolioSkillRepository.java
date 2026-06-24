package com.staffengagement.portfolio.repository;

import com.staffengagement.portfolio.domain.PortfolioSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for {@link PortfolioSkill} entries.
 */
@Repository
public interface PortfolioSkillRepository extends JpaRepository<PortfolioSkill, Long> {

    List<PortfolioSkill> findByPortfolioId(Long portfolioId);

    void deleteByPortfolioId(Long portfolioId);
}