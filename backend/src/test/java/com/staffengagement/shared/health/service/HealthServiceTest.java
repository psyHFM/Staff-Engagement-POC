package com.staffengagement.shared.health.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HealthServiceTest {

    @Test
    void returnsUpStatus() {
        // Given
        var service = new HealthService();

        // When
        var result = service.status();

        // Then
        assertThat(result.status()).isEqualTo("UP");
    }
}