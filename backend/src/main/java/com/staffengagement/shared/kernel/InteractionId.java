package com.staffengagement.shared.kernel;

import java.io.Serializable;

/**
 * Typed identifier for an Interaction.
 *
 * <p>An Interaction records a typed engagement with an employee (type, subject,
 * facilitator). Phase 2 owns the Interaction module. The optional link from a Task
 * back to its source interaction is expressed via this id.
 */
public record InteractionId(Long value) implements Serializable {
}