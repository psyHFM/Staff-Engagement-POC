package com.staffengagement.interaction.service;

/**
 * Thrown when an interaction is created with a {@code facilitator} that does not
 * reference an existing employee ({@code EmployeeContract.exists} returned false).
 * Mapped to 404 by {@code InteractionErrorHandler}.
 */
public class FacilitatorNotFoundException extends RuntimeException {

    public FacilitatorNotFoundException(Long facilitatorId) {
        super("Facilitator employee not found: " + facilitatorId);
    }
}