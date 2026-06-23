package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;

/**
 * A single employee's strength in a skill — the unit the Skills register aggregates.
 * Used to answer "Who's strong on Angular?" with names, years, and project counts.
 */
public record SkillStrength(
        EmployeeId employeeId,
        String employeeName,
        String skill,
        int years,
        int projectCount) {
}