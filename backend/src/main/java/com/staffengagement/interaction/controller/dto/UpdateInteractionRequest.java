package com.staffengagement.interaction.controller.dto;

import com.staffengagement.shared.kernel.InteractionType;

/**
 * Request body for {@code PATCH /api/v1/interactions/{id}} (ATSE1-28).
 *
 * <p>Only the mutable fields ({@code type}, {@code note}) are accepted on edit.
 * {@code subject} and {@code facilitator} are intentionally omitted from the
 * wire — they are part of the audit trail and must remain stable. A request
 * that carries them is silently ignored (the record only declares the mutable
 * fields), so the UI cannot accidentally rewire a past event to a different
 * subject.
 *
 * <p>{@code type} is the frozen {@link InteractionType} so Jackson rejects an
 * unknown value at deserialization (400 before the service is reached).
 * {@code note} is optional free-text.
 */
public record UpdateInteractionRequest(
        InteractionType type,
        String note) {
}
