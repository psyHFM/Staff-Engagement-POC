package com.staffengagement.shared.security;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * BDD unit tests for the login flow incl. Model B role resolution (Phase 1 shared-kernel
 * coordination PR; {@code backend-foundation} delta "JWT + RBAC security stub").
 */
class AuthControllerTest {

    private static final String BASE64_SECRET =
            "Y2hhbmdlLW1lLXRvLWEtcmVhbC1zZWNyZXQta2V5LWZvci1zdGFmZi1lbmdhZ2VtZW50LXBvYw==";

    private final StubUserStore users = new StubUserStore();
    private final JwtTokenProvider provider =
            new JwtTokenProvider(new JwtProperties(BASE64_SECRET, "staff-engagement-poc", 60));

    /** No {@link EmployeeContract} bean available — the pre-Employee-module case. */
    private static ObjectProvider<EmployeeContract> noContract() {
        return emptyProvider();
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<EmployeeContract> emptyProvider() {
        ObjectProvider<EmployeeContract> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        return provider;
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<EmployeeContract> providerWith(EmployeeContract contract) {
        ObjectProvider<EmployeeContract> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(contract);
        return provider;
    }

    private static EmployeeContract contractReturning(Optional<EmployeeSummary> summary) {
        EmployeeContract contract = mock(EmployeeContract.class);
        when(contract.findByEmail("employee@staff.eng")).thenReturn(summary);
        return contract;
    }

    @Test
    void loginWithValidCredentialsReturnsBearerToken() {
        // Given — email-shaped username, no Employee module wired yet
        var controller = new AuthController(users, provider, noContract());
        var request = new AuthController.LoginRequest("employee@staff.eng", "staffeng");

        // When
        var response = controller.login(request);

        // Then
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().token()).isNotBlank();
        assertThat(response.getBody().tokenType()).isEqualTo("Bearer");
    }

    @Test
    void loginWithInvalidCredentialsIsRejected() {
        // Given
        var controller = new AuthController(users, provider, noContract());
        var request = new AuthController.LoginRequest("employee@staff.eng", "wrong");

        // When / Then
        assertThatThrownBy(() -> controller.login(request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void roleResolvedFromEmployeeRecordWhenContractPresent() {
        // Given — an Employee record exists for the principal's email, carrying ADMIN
        var summary = new EmployeeSummary(new EmployeeId(7L), "Jane Admin",
                "employee@staff.eng", EmployeeRole.ADMIN, null, null, null);
        EmployeeContract contract = contractReturning(Optional.of(summary));
        var controller = new AuthController(users, provider, providerWith(contract));
        var request = new AuthController.LoginRequest("employee@staff.eng", "staffeng");

        // When
        var response = controller.login(request);

        // Then — the JWT carries the record's role, not the stub's EMPLOYEE
        assertThat(response.getBody()).isNotNull();
        assertThat(provider.roles(response.getBody().token())).containsExactly("ADMIN");
    }

    @Test
    void fallsBackToStubRoleWhenNoEmployeeRecordYet() {
        // Given — contract is wired but no record exists for this email
        EmployeeContract contract = contractReturning(Optional.empty());
        var controller = new AuthController(users, provider, providerWith(contract));
        var request = new AuthController.LoginRequest("employee@staff.eng", "staffeng");

        // When
        var response = controller.login(request);

        // Then — falls back to the stub's EMPLOYEE role so they can self-create
        assertThat(response.getBody()).isNotNull();
        assertThat(provider.roles(response.getBody().token())).containsExactly("EMPLOYEE");
    }

    @Test
    void adminFallbackRoleWhenNoContractBean() {
        // Given — pre-Employee-module: no EmployeeContract bean at all
        var controller = new AuthController(users, provider, noContract());
        var request = new AuthController.LoginRequest("admin@staff.eng", "staffeng");

        // When
        var response = controller.login(request);

        // Then — stub fallback role list gives ADMIN (admin-ness survives pre-splice)
        assertThat(response.getBody()).isNotNull();
        assertThat(provider.roles(response.getBody().token())).containsExactly("ADMIN");
    }
}