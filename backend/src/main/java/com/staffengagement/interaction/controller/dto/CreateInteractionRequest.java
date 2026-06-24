package com.staffengagement.interaction.controller.dto;

import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionType;

/**
 * Request body for {@code POST /api/v1/interactions}.
 *
 * <p>{@code type} is the frozen {@link InteractionType} so Jackson rejects an
 * unknown value at deserialization (400 before the service is reached). Subject
 * and facilitator are the typed {@link EmployeeId} (wire form {@code {"value":N}}),
 * matching the frozen {@code InteractionSummary} read model for consistency.
 * {@code facilitator} is required in this splice (design D3); {@code note} is
 * optional free-text.
 */
public record CreateInteractionRequest(
        InteractionType type,
        EmployeeId subject,
        EmployeeId facilitator,
        String note) {
}