package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import java.util.List;

/**
 * Frozen cross-module port for the Interaction module (Phase 2 implements this).
 *
 * <p>Reads interactions by {@code subject} (the employee the interaction was for).
 * The {@link InteractionSummary} exposes {@code type}, {@code subject},
 * {@code facilitator}, and note (v1.1.0 model).
 */
public interface InteractionContract {

    List<InteractionSummary> findBySubject(EmployeeId subject);
}