package com.staffengagement.employee.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The Employee seniority level, module-local to the Employee domain (ROADMAP §4 /
 * Phase 1). Unlike {@code EmployeeRole} (which lives in {@code shared/kernel} because
 * the auth layer and cross-module reads need it), {@code level} is Employee-internal —
 * it is carried only by the Employee module's own response DTO, never by the frozen
 * {@code EmployeeContract}/{@code EmployeeSummary}.
 *
 * <p>Optional (may be {@code null}). Stored as the enum name via
 * {@code @Enumerated(EnumType.STRING)} in a {@code varchar(32)} column; the JSON wire
 * form is the lowercase value (e.g. {@code junior}) via {@link JsonProperty}, matching
 * the {@code EmployeeRole}/{@code InteractionType} convention.
 */
public enum EmployeeLevel {
    @JsonProperty("junior") JUNIOR,
    @JsonProperty("intermediate") INTERMEDIATE,
    @JsonProperty("senior") SENIOR
}