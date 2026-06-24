package com.staffengagement.portfolio.service;

/**
 * Thrown when a portfolio operation targets an employee that does not exist
 * ({@code EmployeeContract.exists} returned false, or no employee module is
 * configured to confirm existence). Mapped to 404 by
 * {@code PortfolioErrorHandler}.
 */
public class EmployeeNotFoundException extends RuntimeException {

    public EmployeeNotFoundException(Long employeeId) {
        super("Employee not found: " + employeeId);
    }
}