package com.staffengagement.employee.service;

/**
 * Thrown when a create or identity-binding would collide on an already-used email
 * (email is the unique immutable identity key). Mapped to 409 Conflict by the Employee
 * module error handler.
 */
public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException(String email) {
        super("Email already in use: " + email);
    }
}