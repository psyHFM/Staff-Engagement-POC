package com.staffengagement.profile.controller;

import com.staffengagement.profile.service.PersonProfile;
import com.staffengagement.profile.service.ProfileService;
import com.staffengagement.shared.kernel.EmployeeId;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoint for the rounded employee profile ({@code api-standards.yaml}):
 * {@code /api/v1} prefix, kebab-case path, camelCase JSON, unwrapped response.
 *
 * <p>RBAC: any authenticated user may view any profile, matching the mission's
 * "open one person and see their interactions, tasks, portfolio, and skills".
 * The controller depends on {@link ProfileService} only — never on repositories or
 * other modules' internals.
 */
@RestController
@RequestMapping("/api/v1")
@PreAuthorize("isAuthenticated()")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/employees/{id}/profile")
    public ResponseEntity<PersonProfile> getProfile(@PathVariable Long id) {
        PersonProfile profile = profileService.profileFor(new EmployeeId(id));
        return ResponseEntity.ok(profile);
    }
}
