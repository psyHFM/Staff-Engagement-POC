package com.staffengagement.shared.kernel;

import java.io.Serializable;

/**
 * Typed identifier for an Employee — the central record everything hangs off.
 *
 * <p>Used across module boundaries (frozen contracts) instead of a raw {@code Long}
 * so that contracts stay module-agnostic. Phase 1 owns the Employee module; other
 * modules reference employees only via this id and {@code EmployeeContract}.
 */
public record EmployeeId(Long value) implements Serializable {
}