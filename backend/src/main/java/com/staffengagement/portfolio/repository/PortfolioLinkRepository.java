package com.staffengagement.portfolio.repository;

import com.staffengagement.portfolio.domain.PortfolioLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for {@link PortfolioLink} entries.
 */
@Repository
public interface PortfolioLinkRepository extends JpaRepository<PortfolioLink, Long> {

    List<PortfolioLink> findByPortfolioId(Long portfolioId);

    void deleteByPortfolioId(Long portfolioId);
}