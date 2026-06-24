package com.staffengagement.employee.service;

/**
 * Thrown when an Employee lookup by id finds no record. Mapped to 404 by the Employee
 * module error handler.
 */
public class EmployeeNotFoundException extends RuntimeException {
    public EmployeeNotFoundException(Long id) {
        super("Employee not found: " + id);
    }
}