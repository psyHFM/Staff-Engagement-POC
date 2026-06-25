package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionId;
import java.util.List;
import java.util.Optional;

/**
 * Frozen cross-module port for the Interaction module (Phase 2 implements this).
 *
 * <p>Reads interactions by {@code subject} (the employee the interaction was for).
 * The {@link InteractionSummary} exposes {@code type}, {@code subject},
 * {@code facilitator}, and note (v1.1.0 model).
 *
 * <p>v1.1.0 (2026-06-25, change {@code atse1-25-35-ux-walkthrough-fixes}):
 * added the additive {@link #verifyEditable(InteractionId, EmployeeId, boolean)}
 * method so cross-module callers can validate an interaction id for an
 * edit without reaching into the interaction impl.
 */
public interface InteractionContract {

    List<InteractionSummary> findBySubject(EmployeeId subject);

    /**
     * Returns the interaction id if the actor is allowed to edit it,
     * or {@link Optional#empty()} otherwise. Admins (when
     * {@code isAdmin} is true) can edit any interaction; non-admins
     * can only edit interactions they facilitated.
     *
     * <p>Returning {@code empty()} for both "not found" and
     * "not authorised" prevents the existence leak that a 403 would
     * otherwise expose.
     */
    default Optional<InteractionId> verifyEditable(
            InteractionId id, EmployeeId actor, boolean isAdmin) {
        return Optional.empty();
    }
}