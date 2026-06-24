package com.staffengagement.employee.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.staffengagement.employee.controller.dto.CreateEmployeeRequest;
import com.staffengagement.employee.domain.EmployeeLevel;
import com.staffengagement.employee.service.EmployeeException;
import com.staffengagement.shared.error.ErrorEnvelope;
import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.Authentication;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

/**
 * BDD unit tests for {@link EmployeeErrorHandler} — verifies the module's single
 * {@link EmployeeException} (discriminated by {@link EmployeeException.Kind}) plus
 * malformed bodies and Bean Validation failures map to the uniform
 * {@link ErrorEnvelope} with the right status. No Spring context (per
 * {@code testing-strategy.yaml}).
 */
class EmployeeErrorHandlerTest {

    private final EmployeeErrorHandler handler = new EmployeeErrorHandler();

    private HttpServletRequest request(String path) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRequestURI()).thenReturn(path);
        return req;
    }

    @Test
    void notFoundKindMapsTo404Envelope() {
        // Given
        var ex = new EmployeeException(EmployeeException.Kind.NOT_FOUND, "Employee not found: 42");

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleEmployee(ex, request("/api/v1/employees/42"));

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(404);
        assertThat(response.getBody().error()).isEqualTo("Not Found");
        assertThat(response.getBody().message()).isEqualTo("Employee not found: 42");
        assertThat(response.getBody().path()).isEqualTo("/api/v1/employees/42");
        assertThat(response.getBody().timestamp()).isNotNull();
    }

    @Test
    void duplicateEmailKindMapsTo409Envelope() {
        // Given
        var ex = new EmployeeException(EmployeeException.Kind.DUPLICATE_EMAIL, "Email already in use: jane@staff.eng");

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleEmployee(ex, request("/api/v1/employees"));

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().status()).isEqualTo(409);
        assertThat(response.getBody().error()).isEqualTo("Conflict");
        assertThat(response.getBody().message()).contains("jane@staff.eng");
    }

    @Test
    void accessDeniedKindMapsTo403Envelope() {
        // Given
        var ex = new EmployeeException(EmployeeException.Kind.ACCESS_DENIED, "Not allowed to update employee: 7");

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleEmployee(ex, request("/api/v1/employees/7"));

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().status()).isEqualTo(403);
        assertThat(response.getBody().error()).isEqualTo("Forbidden");
        assertThat(response.getBody().message()).contains("7");
    }

    @Test
    void validationFailureMapsTo400EnvelopeWithFieldMessages() throws Exception {
        // Given — a Bean Validation failure on the create body (fullName blank)
        Method method = EmployeeController.class.getMethod(
                "create", CreateEmployeeRequest.class, String.class, Authentication.class);
        MethodParameter parameter = new MethodParameter(method, 0);
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(
                new CreateEmployeeRequest("", null, null, EmployeeLevel.SENIOR), "createEmployeeRequest");
        bindingResult.addError(new FieldError("createEmployeeRequest", "fullName", "must not be blank"));
        var ex = new MethodArgumentNotValidException(parameter, bindingResult);

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleValidation(ex, request("/api/v1/employees"));

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().status()).isEqualTo(400);
        assertThat(response.getBody().error()).isEqualTo("Bad Request");
        assertThat(response.getBody().message()).contains("fullName").contains("must not be blank");
        assertThat(response.getBody().path()).isEqualTo("/api/v1/employees");
    }

    @Test
    void malformedOrInvalidBodyMapsTo400Envelope() {
        // Given — e.g. an unknown EmployeeLevel value fails Jackson deserialization
        var ex = new HttpMessageNotReadableException("bad", (org.springframework.http.HttpInputMessage) null);

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleNotReadable(ex, request("/api/v1/employees"));

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().status()).isEqualTo(400);
        assertThat(response.getBody().error()).isEqualTo("Bad Request");
        assertThat(response.getBody().message()).isEqualTo("Malformed or invalid request body");
        assertThat(response.getBody().path()).isEqualTo("/api/v1/employees");
    }
}