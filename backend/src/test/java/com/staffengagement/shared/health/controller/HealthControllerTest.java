package com.staffengagement.shared.health.controller;

import com.staffengagement.shared.health.HealthResponse;
import com.staffengagement.shared.health.service.HealthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link HealthController}.
 * Verifies health endpoint returns correct response.
 */
@DisplayName("HealthController")
class HealthControllerTest {

    private HealthService healthService;
    private HealthController healthController;

    @BeforeEach
    void setUp() {
        healthService = new HealthService();
        healthController = new HealthController(healthService);
    }

    @Test
    @DisplayName("should create HealthController with HealthService")
    void constructor_shouldCreateHealthController() {
        // Given
        HealthService service = new HealthService();

        // When
        HealthController controller = new HealthController(service);

        // Then
        assertThat(controller).isNotNull();
    }

    @Test
    @DisplayName("should return health status UP")
    void health_shouldReturnStatusUp() {
        // Given/When
        HealthResponse response = healthController.health();

        // Then
        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("UP");
    }

    @Test
    @DisplayName("should delegate to HealthService")
    void health_shouldDelegateToService() {
        // Given
        HealthService mockService = new HealthService();
        HealthController controller = new HealthController(mockService);

        // When
        HealthResponse response = controller.health();

        // Then
        assertThat(response.status()).isEqualTo("UP");
    }

    @Test
    @DisplayName("should return HealthResponse with non-null status")
    void health_shouldReturnNonNullStatus() {
        // When
        HealthResponse response = healthController.health();

        // Then
        assertThat(response.status()).isNotNull();
        assertThat(response.status()).isNotBlank();
    }

    @Test
    @DisplayName("should have correct mapping annotation")
    void shouldHaveCorrectMappingAnnotation() throws NoSuchMethodException {
        // Given
        var method = HealthController.class.getDeclaredMethod("health");

        // Then
        assertThat(method).isNotNull();
        assertThat(method.getAnnotation(org.springframework.web.bind.annotation.GetMapping.class)).isNotNull();
        assertThat(method.getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class)).isNotNull();
    }

    @Test
    @DisplayName("should have correct request mapping on class")
    void shouldHaveCorrectClassMapping() {
        // Then
        RequestMapping classMapping = HealthController.class.getAnnotation(RequestMapping.class);
        assertThat(classMapping).isNotNull();
        assertThat(classMapping.value()).contains("/api/v1/health");
    }

    @Test
    @DisplayName("should be annotated as RestController")
    void shouldAnnotatedAsRestController() {
        // Then
        assertThat(HealthController.class.getAnnotation(RestController.class)).isNotNull();
    }
}
