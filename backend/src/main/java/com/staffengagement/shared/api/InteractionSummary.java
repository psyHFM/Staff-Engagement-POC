package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.shared.kernel.InteractionType;
import java.time.Instant;

/**
 * Read model for an Interaction, returned by {@link InteractionContract}.
 *
 * <p>Encodes the v1.1.0 domain model: {@code type} (controlled vocabulary),
 * {@code subject} (who the interaction was for), {@code facilitator} (who facilitated,
 * defaulting to the logged-in user), {@code subjectText} (brief subject/summary),
 * {@code note}, and {@code createdAt}.
 *
 * <p>{@code facilitatorName} is the denormalised full name of the facilitator at the time
 * of creation, so the UI can render the history without an extra employee lookup.
 */
public record InteractionSummary(
        InteractionId id,
        InteractionType type,
        EmployeeId subject,
        EmployeeId facilitator,
        String facilitatorName,
        String subjectText,
        String note,
        Instant createdAt) {
}