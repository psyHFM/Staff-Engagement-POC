package com.staffengagement.shared.health.service;

import com.staffengagement.shared.health.HealthResponse;
import org.springframework.stereotype.Service;

/**
 * Service layer for the health stub. Business logic lives here, not in the controller
 * (layered architecture: controller -> service -> repository).
 */
@Service
public class HealthService {

    public HealthResponse status() {
        return new HealthResponse("UP");
    }
}