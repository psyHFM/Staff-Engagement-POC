package com.staffengagement.shared.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link JwtProperties}.
 * Verifies configuration property binding.
 */
@DisplayName("JwtProperties")
class JwtPropertiesTest {

    @Test
    @DisplayName("should be annotated with ConfigurationProperties")
    void shouldHaveConfigurationPropertiesAnnotation() {
        // Given/When
        ConfigurationProperties annotation = JwtProperties.class.getAnnotation(ConfigurationProperties.class);

        // Then
        assertThat(annotation).isNotNull();
        assertThat(annotation.prefix()).isEqualTo("staffengagement.security.jwt");
    }

    @Test
    @DisplayName("should create JwtProperties record with constructor")
    void constructor_shouldCreateJwtProperties() {
        // Given
        String secret = "test-secret";
        String issuer = "test-issuer";
        int expirationMinutes = 60;

        // When
        JwtProperties props = new JwtProperties(secret, issuer, expirationMinutes);

        // Then
        assertThat(props.secret()).isEqualTo(secret);
        assertThat(props.issuer()).isEqualTo(issuer);
        assertThat(props.expirationMinutes()).isEqualTo(expirationMinutes);
    }

    @Test
    @DisplayName("should create copy with modified values using copy constructor")
    void copyConstructor_shouldCreateModifiedCopy() {
        // Given
        JwtProperties original = new JwtProperties("secret1", "issuer1", 30);

        // When - create a new instance with modified values (records don't have withers)
        JwtProperties modified = new JwtProperties("secret2", original.issuer(), original.expirationMinutes());

        // Then
        assertThat(original.secret()).isEqualTo("secret1");
        assertThat(modified.secret()).isEqualTo("secret2");
        assertThat(original.issuer()).isEqualTo("issuer1");
        assertThat(modified.issuer()).isEqualTo("issuer1"); // unchanged
    }

    @Test
    @DisplayName("should equal another instance with same values")
    void equals_shouldCompareByValues() {
        // Given
        JwtProperties props1 = new JwtProperties("secret", "issuer", 60);
        JwtProperties props2 = new JwtProperties("secret", "issuer", 60);

        // Then
        assertThat(props1).isEqualTo(props2);
    }

    @Test
    @DisplayName("should not equal instance with different values")
    void equals_shouldDifferByValues() {
        // Given
        JwtProperties props1 = new JwtProperties("secret1", "issuer", 60);
        JwtProperties props2 = new JwtProperties("secret2", "issuer", 60);

        // Then
        assertThat(props1).isNotEqualTo(props2);
    }

    @Test
    @DisplayName("should generate hashCode based on values")
    void hashCode_shouldBeConsistent() {
        // Given
        JwtProperties props1 = new JwtProperties("secret", "issuer", 60);
        JwtProperties props2 = new JwtProperties("secret", "issuer", 60);

        // Then
        assertThat(props1.hashCode()).isEqualTo(props2.hashCode());
    }

    @Test
    @DisplayName("should toString include all field values")
    void toString_shouldIncludeFieldValues() {
        // Given
        JwtProperties props = new JwtProperties("my-secret", "my-issuer", 120);

        // When
        String toString = props.toString();

        // Then
        assertThat(toString).contains("my-secret");
        assertThat(toString).contains("my-issuer");
        assertThat(toString).contains("120");
    }

    @SpringBootTest(classes = JwtPropertiesTest.TestConfig.class)
    @TestPropertySource(properties = {
            "staffengagement.security.jwt.secret=test-secret-from-props",
            "staffengagement.security.jwt.issuer=test-issuer-from-props",
            "staffengagement.security.jwt.expiration-minutes=90"
    })
    @DisplayName("Configuration Properties Binding")
    static class PropertyBindingTest {

        @org.springframework.beans.factory.annotation.Autowired
        private JwtProperties jwtProperties;

        @Test
        @DisplayName("should bind properties from configuration")
        void shouldBindProperties() {
            // Then
            assertThat(jwtProperties.secret()).isEqualTo("test-secret-from-props");
            assertThat(jwtProperties.issuer()).isEqualTo("test-issuer-from-props");
            assertThat(jwtProperties.expirationMinutes()).isEqualTo(90);
        }
    }

    @org.springframework.context.annotation.Configuration
    @EnableConfigurationProperties(JwtProperties.class)
    static class TestConfig {
    }
}
