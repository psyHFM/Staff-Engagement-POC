package com.staffengagement.profile.service;

import com.staffengagement.shared.kernel.EmployeeId;

/**
 * Domain exception raised by {@link ProfileService} when the requested employee does not
 * exist. Mapped to a 404 response by {@link com.staffengagement.profile.controller.ProfileErrorHandler}.
 */
public class ProfileNotFoundException extends RuntimeException {

    private final EmployeeId employeeId;

    public ProfileNotFoundException(EmployeeId employeeId) {
        super("Employee profile not found: " + employeeId.value());
        this.employeeId = employeeId;
    }

    public EmployeeId employeeId() {
        return employeeId;
    }
}
