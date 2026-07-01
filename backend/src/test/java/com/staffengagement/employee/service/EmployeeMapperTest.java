package com.staffengagement.employee.service;

import com.staffengagement.employee.domain.Employee;
import com.staffengagement.employee.domain.EmployeeLevel;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link EmployeeMapper}.
 * Verifies entity-to-read-model mapping.
 */
@DisplayName("EmployeeMapper")
class EmployeeMapperTest {

    @Test
    @DisplayName("toSummary should map Employee to EmployeeSummary with all fields")
    void toSummary_shouldMapToEmployeeSummary() {
        // Given
        Employee employee = new Employee();
        employee.setId(42L);
        employee.setFullName("Test User");
        employee.setEmail("test@staff.eng");
        employee.setRole(EmployeeRole.ADMIN);
        employee.setJobTitle("Senior Developer");
        employee.setDepartment("Engineering");
        employee.setLevel(EmployeeLevel.SENIOR);
        employee.setCreatedAt(Instant.now());
        employee.setUpdatedAt(Instant.now());

        // When
        EmployeeSummary summary = EmployeeMapper.toSummary(employee);

        // Then
        assertThat(summary.id()).isEqualTo(new EmployeeId(42L));
        assertThat(summary.fullName()).isEqualTo("Test User");
        assertThat(summary.email()).isEqualTo("test@staff.eng");
        assertThat(summary.role()).isEqualTo(EmployeeRole.ADMIN);
        assertThat(summary.jobTitle()).isEqualTo("Senior Developer");
        assertThat(summary.department()).isEqualTo("Engineering");
        assertThat(summary.level()).isEqualTo("senior");
    }

    @Test
    @DisplayName("toSummary should handle null level")
    void toSummary_withNullLevel_shouldSetNullInSummary() {
        // Given
        Employee employee = new Employee();
        employee.setId(1L);
        employee.setFullName("No Level User");
        employee.setEmail("nolevel@staff.eng");
        employee.setRole(EmployeeRole.EMPLOYEE);
        employee.setJobTitle("Developer");
        employee.setDepartment("Engineering");
        employee.setLevel(null);

        // When
        EmployeeSummary summary = EmployeeMapper.toSummary(employee);

        // Then
        assertThat(summary.level()).isNull();
    }

    @Test
    @DisplayName("toSummary should convert level to lowercase string")
    void toSummary_shouldConvertLevelToLowercase() {
        // Given
        Employee employee = new Employee();
        employee.setId(2L);
        employee.setFullName("Junior User");
        employee.setEmail("junior@staff.eng");
        employee.setRole(EmployeeRole.EMPLOYEE);
        employee.setLevel(EmployeeLevel.JUNIOR);

        // When
        EmployeeSummary summary = EmployeeMapper.toSummary(employee);

        // Then
        assertThat(summary.level()).isEqualTo("junior");
    }

    @Test
    @DisplayName("toSummary should map INTERMEDIATE level correctly")
    void toSummary_shouldMapIntermediateLevel() {
        // Given
        Employee employee = new Employee();
        employee.setId(3L);
        employee.setFullName("Intermediate User");
        employee.setEmail("intermediate@staff.eng");
        employee.setLevel(EmployeeLevel.INTERMEDIATE);

        // When
        EmployeeSummary summary = EmployeeMapper.toSummary(employee);

        // Then
        assertThat(summary.level()).isEqualTo("intermediate");
    }

    @Test
    @DisplayName("toSummary should map SENIOR level correctly")
    void toSummary_shouldMapSeniorLevel() {
        // Given
        Employee employee = new Employee();
        employee.setId(4L);
        employee.setFullName("Senior User");
        employee.setEmail("senior@staff.eng");
        employee.setLevel(EmployeeLevel.SENIOR);

        // When
        EmployeeSummary summary = EmployeeMapper.toSummary(employee);

        // Then
        assertThat(summary.level()).isEqualTo("senior");
    }

    @Test
    @DisplayName("toSummary should wrap Long id in EmployeeId typed value object")
    void toSummary_shouldWrapIdInEmployeeId() {
        // Given
        Employee employee = new Employee();
        employee.setId(999L);
        employee.setFullName("ID Test");
        employee.setEmail("idtest@staff.eng");
        employee.setRole(EmployeeRole.EMPLOYEE);

        // When
        EmployeeSummary summary = EmployeeMapper.toSummary(employee);

        // Then
        assertThat(summary.id()).isInstanceOf(EmployeeId.class);
        assertThat(summary.id().value()).isEqualTo(999L);
    }

    @Test
    @DisplayName("toResponse should map Employee to EmployeeResponse with timestamps")
    void toResponse_shouldMapToEmployeeResponse() {
        // Given
        Instant createdAt = Instant.ofEpochSecond(1_000_000);
        Instant updatedAt = Instant.ofEpochSecond(2_000_000);

        Employee employee = new Employee();
        employee.setId(42L);
        employee.setFullName("Response User");
        employee.setEmail("response@staff.eng");
        employee.setRole(EmployeeRole.ADMIN);
        employee.setJobTitle("Tech Lead");
        employee.setDepartment("Platform");
        employee.setLevel(EmployeeLevel.SENIOR);
        employee.setCreatedAt(createdAt);
        employee.setUpdatedAt(updatedAt);

        // When
        EmployeeResponse response = EmployeeMapper.toResponse(employee);

        // Then
        assertThat(response.id()).isEqualTo(new EmployeeId(42L));
        assertThat(response.fullName()).isEqualTo("Response User");
        assertThat(response.email()).isEqualTo("response@staff.eng");
        assertThat(response.role()).isEqualTo(EmployeeRole.ADMIN);
        assertThat(response.jobTitle()).isEqualTo("Tech Lead");
        assertThat(response.department()).isEqualTo("Platform");
        assertThat(response.level()).isEqualTo(EmployeeLevel.SENIOR);
        assertThat(response.createdAt()).isEqualTo(createdAt);
        assertThat(response.updatedAt()).isEqualTo(updatedAt);
    }

    @Test
    @DisplayName("toResponse should preserve null level")
    void toResponse_withNullLevel_shouldPreserveNull() {
        // Given
        Employee employee = new Employee();
        employee.setId(5L);
        employee.setFullName("Null Level");
        employee.setEmail("nulllevel@staff.eng");
        employee.setRole(EmployeeRole.EMPLOYEE);
        employee.setLevel(null);

        // When
        EmployeeResponse response = EmployeeMapper.toResponse(employee);

        // Then
        assertThat(response.level()).isNull();
    }

    @Test
    @DisplayName("toResponse should include all timestamps")
    void toResponse_shouldIncludeTimestamps() {
        // Given
        Instant now = Instant.now();
        Employee employee = new Employee();
        employee.setId(6L);
        employee.setFullName("Timestamp User");
        employee.setEmail("timestamp@staff.eng");
        employee.setRole(EmployeeRole.EMPLOYEE);
        employee.setCreatedAt(now);
        employee.setUpdatedAt(now);

        // When
        EmployeeResponse response = EmployeeMapper.toResponse(employee);

        // Then
        assertThat(response.createdAt()).isNotNull();
        assertThat(response.updatedAt()).isNotNull();
    }

    @Test
    @DisplayName("toSummary and toResponse should produce consistent id and name")
    void mapping_shouldProduceConsistentIdAndName() {
        // Given
        Employee employee = new Employee();
        employee.setId(7L);
        employee.setFullName("Consistent User");
        employee.setEmail("consistent@staff.eng");
        employee.setRole(EmployeeRole.EMPLOYEE);

        // When
        EmployeeSummary summary = EmployeeMapper.toSummary(employee);
        EmployeeResponse response = EmployeeMapper.toResponse(employee);

        // Then
        assertThat(summary.id()).isEqualTo(response.id());
        assertThat(summary.fullName()).isEqualTo(response.fullName());
        assertThat(summary.email()).isEqualTo(response.email());
        assertThat(summary.role()).isEqualTo(response.role());
    }
}
