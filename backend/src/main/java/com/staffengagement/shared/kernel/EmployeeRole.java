package com.staffengagement.shared.kernel;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The controlled vocabulary of Employee roles, frozen in {@code shared/kernel}
 * (constitution v1.1.0 / ROADMAP §3 Phase 0; {@code EmployeeRole} added in the
 * Phase 1 shared-kernel coordination PR).
 *
 * <p>The role lives on the {@code Employee} record (Phase 1, Model B) and is resolved
 * into the JWT at login. It is referenced by both {@code shared/security} and the
 * Employee module with no cross-module import, so it must stay in the kernel. The
 * {@code MANAGER} role SHALL NOT exist. The JSON form is the lowercase value
 * (e.g. {@code admin}); the token claim uses {@link #name()} (e.g. {@code ADMIN})
 * so the authority is {@code ROLE_ADMIN}.
 */
public enum EmployeeRole {
    @JsonProperty("employee") EMPLOYEE,
    @JsonProperty("admin") ADMIN
}