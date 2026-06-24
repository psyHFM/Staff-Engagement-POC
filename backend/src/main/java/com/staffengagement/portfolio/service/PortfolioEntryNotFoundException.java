package com.staffengagement.portfolio.service;

/**
 * Thrown when a sub-resource (skill / education / project / link) entry is requested
 * by id but does not exist, or does not belong to the portfolio of the targeted
 * employee. Mapped to 404 by {@code PortfolioErrorHandler}.
 */
public class PortfolioEntryNotFoundException extends RuntimeException {

    public PortfolioEntryNotFoundException(Long entryId) {
        super("Portfolio entry not found: " + entryId);
    }
}