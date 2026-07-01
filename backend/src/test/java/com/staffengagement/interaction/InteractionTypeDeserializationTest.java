package com.staffengagement.interaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.staffengagement.interaction.controller.dto.UpdateInteractionRequest;
import com.staffengagement.shared.kernel.InteractionType;
import org.junit.jupiter.api.Test;

/**
 * BDD tests for Jackson deserialization of {@link InteractionType} enum values.
 * Verifies that kebab-case JSON values (e.g., "catch-up", "check-in") are
 * correctly deserialized to their enum constants via {@code @JsonProperty}.
 */
class InteractionTypeDeserializationTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void deserializesCatchUpAsCATCH_UP() throws Exception {
        // Given — JSON with kebab-case "catch-up" value
        String json = "{\"type\":\"catch-up\",\"note\":\"test note\"}";

        // When — deserializing to UpdateInteractionRequest
        UpdateInteractionRequest request = mapper.readValue(json, UpdateInteractionRequest.class);

        // Then — Jackson maps "catch-up" to CATCH_UP enum constant
        assertThat(request.type()).isEqualTo(InteractionType.CATCH_UP);
        assertThat(request.note()).isEqualTo("test note");
    }

    @Test
    void deserializesCheckInAsCHECK_IN() throws Exception {
        // Given — JSON with kebab-case "check-in" value
        String json = "{\"type\":\"check-in\",\"note\":\"test note\"}";

        // When
        UpdateInteractionRequest request = mapper.readValue(json, UpdateInteractionRequest.class);

        // Then
        assertThat(request.type()).isEqualTo(InteractionType.CHECK_IN);
    }

    @Test
    void deserializesMentoringAsMENTORING() throws Exception {
        // Given
        String json = "{\"type\":\"mentoring\",\"note\":\"test note\"}";

        // When
        UpdateInteractionRequest request = mapper.readValue(json, UpdateInteractionRequest.class);

        // Then
        assertThat(request.type()).isEqualTo(InteractionType.MENTORING);
    }

    @Test
    void deserializesPerformanceAsPERFORMANCE() throws Exception {
        // Given
        String json = "{\"type\":\"performance\",\"note\":\"test note\"}";

        // When
        UpdateInteractionRequest request = mapper.readValue(json, UpdateInteractionRequest.class);

        // Then
        assertThat(request.type()).isEqualTo(InteractionType.PERFORMANCE);
    }

    @Test
    void deserializesOtherAsOTHER() throws Exception {
        // Given
        String json = "{\"type\":\"other\",\"note\":\"test note\"}";

        // When
        UpdateInteractionRequest request = mapper.readValue(json, UpdateInteractionRequest.class);

        // Then
        assertThat(request.type()).isEqualTo(InteractionType.OTHER);
    }

    @Test
    void rejectsUnknownTypeValueWithInvalidFormatException() {
        // Given — invalid type value not in the frozen vocabulary
        String json = "{\"type\":\"unknown-type\",\"note\":\"test note\"}";

        // When / Then — Jackson throws InvalidFormatException at deserialization
        assertThatThrownBy(() -> mapper.readValue(json, UpdateInteractionRequest.class))
                .isInstanceOf(InvalidFormatException.class)
                .hasMessageContaining("InteractionType");
    }

    @Test
    void rejectsCaseSensitiveTypeValue() {
        // Given — wrong case (JSON is case-sensitive for enum values)
        String json = "{\"type\":\"Catch-Up\",\"note\":\"test note\"}";

        // When / Then — case mismatch is rejected
        assertThatThrownBy(() -> mapper.readValue(json, UpdateInteractionRequest.class))
                .isInstanceOf(InvalidFormatException.class);
    }

    @Test
    void acceptsNullTypeInRequest() throws Exception {
        // Given — null type (edge case for PATCH with partial content)
        String json = "{\"type\":null,\"note\":\"test note\"}";

        // When — null is allowed at the JSON level (validation happens later)
        UpdateInteractionRequest request = mapper.readValue(json, UpdateInteractionRequest.class);

        // Then — null type passes through to service layer for validation
        assertThat(request.type()).isNull();
        assertThat(request.note()).isEqualTo("test note");
    }

    @Test
    void acceptsMissingTypeFieldAsNull() throws Exception {
        // Given — missing type field in JSON
        String json = "{\"note\":\"test note\"}";

        // When
        UpdateInteractionRequest request = mapper.readValue(json, UpdateInteractionRequest.class);

        // Then — missing field becomes null
        assertThat(request.type()).isNull();
        assertThat(request.note()).isEqualTo("test note");
    }
}
