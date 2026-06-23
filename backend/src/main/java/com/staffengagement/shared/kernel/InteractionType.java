package com.staffengagement.shared.kernel;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The controlled vocabulary of interaction kinds, frozen in {@code shared/kernel}
 * (constitution v1.1.0 / ROADMAP §3 Phase 0).
 *
 * <p>An {@code Interaction} records its {@code type} as one of these values; free-text
 * type is not allowed — the note body carries the free-form detail. The JSON form is
 * the lowercase-kebab value from the constitution (e.g. {@code check-in}).
 */
public enum InteractionType {
    @JsonProperty("check-in") CHECK_IN,
    @JsonProperty("mentoring") MENTORING,
    @JsonProperty("catch-up") CATCH_UP,
    @JsonProperty("performance") PERFORMANCE,
    @JsonProperty("other") OTHER
}