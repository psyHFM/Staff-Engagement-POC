package com.staffengagement.interaction.service;

/**
 * Thrown when an interaction is requested by id but no such interaction exists.
 * Mapped to 404 by {@code InteractionErrorHandler}.
 */
public class InteractionNotFoundException extends RuntimeException {

    public InteractionNotFoundException(Long interactionId) {
        super("Interaction not found: " + interactionId);
    }
}