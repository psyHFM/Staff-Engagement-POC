package com.staffengagement.interaction.service;

/**
 * Thrown when an interaction is created for a {@code subject} that does not
 * reference an existing employee ({@code EmployeeContract.exists} returned
 * false). Mapped to 404 by {@code InteractionErrorHandler}.
 */
public class SubjectNotFoundException extends RuntimeException {

    public SubjectNotFoundException(Long subjectId) {
        super("Subject employee not found: " + subjectId);
    }
}