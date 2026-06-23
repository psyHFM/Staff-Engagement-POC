package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.shared.kernel.InteractionType;

/**
 * Read model for an Interaction, returned by {@link InteractionContract}.
 *
 * <p>Encodes the v1.1.0 domain model: {@code type} (controlled vocabulary),
 * {@code subject} (who the interaction was for), {@code facilitator} (who facilitated,
 * defaulting to the logged-in user), and {@code note}.
 */
public record InteractionSummary(
        InteractionId id,
        InteractionType type,
        EmployeeId subject,
        EmployeeId facilitator,
        String note) {
}