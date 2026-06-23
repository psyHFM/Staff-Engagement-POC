package com.staffengagement.shared.kernel;

import java.io.Serializable;

/**
 * Typed identifier for a Task.
 *
 * <p>A Task is person-level and may originate from an interaction or standalone.
 * Phase 3 owns the Task module.
 */
public record TaskId(Long value) implements Serializable {
}