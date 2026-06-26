package com.staffengagement.portfolio.service;

/**
 * Thrown when a mutating portfolio operation is attempted by a caller who is not
 * the portfolio's owner and not an ADMIN (ATSE1-39 RBAC). Mapped to 403 by
 * {@link com.staffengagement.portfolio.controller.PortfolioErrorHandler}.
 */
public class PortfolioException extends RuntimeException {

    public enum Kind {
        /** Caller is neither the portfolio owner nor an ADMIN (ATSE1-39). */
        ACCESS_DENIED
    }

    private final Kind kind;

    public PortfolioException(Kind kind, String message) {
        super(message);
        this.kind = kind;
    }

    public Kind kind() {
        return kind;
    }
}