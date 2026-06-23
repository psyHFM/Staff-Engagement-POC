package com.staffengagement.shared.health.controller;

import com.staffengagement.shared.health.HealthResponse;
import com.staffengagement.shared.health.service.HealthService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/v1/health} — the Phase 0 stub proving the layered layout compiles and
 * runs. Protected by the security stub (any authenticated user).
 */
@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public HealthResponse health() {
        return healthService.status();
    }
}