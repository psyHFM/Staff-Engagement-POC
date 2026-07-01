package com.staffengagement.interaction.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.staffengagement.interaction.controller.dto.CreateInteractionRequest;
import com.staffengagement.interaction.controller.dto.UpdateInteractionRequest;
import com.staffengagement.interaction.service.InteractionNotFoundException;
import com.staffengagement.interaction.service.InteractionService;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.api.PageRequest;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.shared.kernel.InteractionType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

/**
 * BDD unit tests for {@link InteractionController}. The service is mocked — no
 * Spring MVC context (per {@code testing-strategy.yaml}: unit tests only). RBAC
 * (the {@code @PreAuthorize} declarations) is verified separately by
 * {@link InteractionAccessControlTest}; the 401/403 envelope behaviour itself is
 * the shared security layer (Phase 0).
 */
@ExtendWith(MockitoExtension.class)
class InteractionControllerTest {

    @Mock
    private InteractionService interactionService;

    @InjectMocks
    private InteractionController controller;

    @Test
    void createReturns201WithCreatedSummaryAndForwardsBody() {
        // Given — the service persists and returns the created summary
        InteractionSummary created = new InteractionSummary(
                new InteractionId(42L), InteractionType.CHECK_IN, new EmployeeId(1L), new EmployeeId(2L),
                "Admin User", "subject text", "note", Instant.parse("2026-06-25T10:00:00Z"));
        when(interactionService.create(any(), any(), any(), any(), any())).thenReturn(created);

        // When
        var response = controller.create(
                new CreateInteractionRequest(InteractionType.CHECK_IN, new EmployeeId(1L), new EmployeeId(2L), "subject text", "note"));

        // Then — 201 with the unwrapped summary, body forwarded to the service
        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isEqualTo(created);

        ArgumentCaptor<InteractionType> type = ArgumentCaptor.forClass(InteractionType.class);
        ArgumentCaptor<EmployeeId> subject = ArgumentCaptor.forClass(EmployeeId.class);
        ArgumentCaptor<EmployeeId> facilitator = ArgumentCaptor.forClass(EmployeeId.class);
        ArgumentCaptor<String> subjectText = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> note = ArgumentCaptor.forClass(String.class);
        verify(interactionService).create(type.capture(), subject.capture(), facilitator.capture(), subjectText.capture(), note.capture());
        assertThat(type.getValue()).isEqualTo(InteractionType.CHECK_IN);
        assertThat(subject.getValue()).isEqualTo(new EmployeeId(1L));
        assertThat(facilitator.getValue()).isEqualTo(new EmployeeId(2L));
        assertThat(subjectText.getValue()).isEqualTo("subject text");
        assertThat(note.getValue()).isEqualTo("note");
    }

    @Test
    void listBySubjectReturnsPagedResultAndBindsSubjectOffsetAndLimit() {
        // Given — the service returns a page of one interaction
        InteractionSummary summary = new InteractionSummary(
                new InteractionId(7L), InteractionType.MENTORING, new EmployeeId(1L), new EmployeeId(2L),
                "Facilitator Name", "n", "n", Instant.parse("2026-06-25T10:00:00Z"));
        Paged<InteractionSummary> page = new Paged<>(List.of(summary), 0, 20, 1L);
        when(interactionService.findPageBySubject(any(), any(), any())).thenReturn(page);

        // When
        Paged<InteractionSummary> result = controller.listBySubject(1L, 0, 20, "createdAt,desc");

        // Then — the subject id is bound to an EmployeeId and offset/limit are forwarded
        assertThat(result).isEqualTo(page);
        verify(interactionService).findPageBySubject(eq(new EmployeeId(1L)), eq(PageRequest.of(0, 20)), any(Sort.class));
    }

    @Test
    void listBySubjectAppliesDefaultSortWhenParamOmitted() {
        // Given
        when(interactionService.findPageBySubject(any(), any(), any()))
                .thenReturn(new Paged<>(List.of(), 0, 20, 0L));

        // When — no sort param
        controller.listBySubject(1L, 0, 20, null);

        // Then — the service receives the default createdAt,desc sort
        ArgumentCaptor<Sort> sort = ArgumentCaptor.forClass(Sort.class);
        verify(interactionService).findPageBySubject(any(), any(), sort.capture());
        assertThat(sort.getValue()).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Test
    void listBySubjectParsesExplicitAscendingSort() {
        // Given
        when(interactionService.findPageBySubject(any(), any(), any()))
                .thenReturn(new Paged<>(List.of(), 0, 20, 0L));

        // When
        controller.listBySubject(1L, 0, 20, "createdAt,asc");

        // Then
        ArgumentCaptor<Sort> sort = ArgumentCaptor.forClass(Sort.class);
        verify(interactionService).findPageBySubject(any(), any(), sort.capture());
        assertThat(sort.getValue()).isEqualTo(Sort.by(Sort.Direction.ASC, "createdAt"));
    }

    @Test
    void listBySubjectFallsBackToDefaultSortForUnknownField() {
        // Given — an unsupported field is supplied
        when(interactionService.findPageBySubject(any(), any(), any()))
                .thenReturn(new Paged<>(List.of(), 0, 20, 0L));

        // When
        controller.listBySubject(1L, 0, 20, "name,desc");

        // Then — unknown fields never reach the query; default createdAt,desc applies
        ArgumentCaptor<Sort> sort = ArgumentCaptor.forClass(Sort.class);
        verify(interactionService).findPageBySubject(any(), any(), sort.capture());
        assertThat(sort.getValue()).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Test
    void listBySubjectFallsBackToDefaultSortForMalformedParam() {
        // Given — a single-token (no direction) sort param
        when(interactionService.findPageBySubject(any(), any(), any()))
                .thenReturn(new Paged<>(List.of(), 0, 20, 0L));

        // When
        controller.listBySubject(1L, 0, 20, "createdAt");

        // Then — malformed input falls back to the default, never throws
        ArgumentCaptor<Sort> sort = ArgumentCaptor.forClass(Sort.class);
        verify(interactionService).findPageBySubject(any(), any(), sort.capture());
        assertThat(sort.getValue()).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Test
    void getByIdReturnsSummaryWhenPresent() {
        // Given
        InteractionSummary summary = new InteractionSummary(
                new InteractionId(5L), InteractionType.CATCH_UP, new EmployeeId(1L), new EmployeeId(2L),
                "Facilitator Name", "subject", "note", Instant.parse("2026-06-25T10:00:00Z"));
        when(interactionService.findById(new InteractionId(5L))).thenReturn(Optional.of(summary));

        // When
        InteractionSummary result = controller.getById(5L);

        // Then
        assertThat(result).isEqualTo(summary);
    }

    @Test
    void getByIdThrowsNotFoundWhenAbsent() {
        // Given — no interaction for the id
        when(interactionService.findById(new InteractionId(99L))).thenReturn(Optional.empty());

        // When / Then — the controller raises the domain exception (mapped to 404 by the error handler)
        assertThatThrownBy(() -> controller.getById(99L))
                .isInstanceOf(InteractionNotFoundException.class);
    }

    // ---- ATSE1-28 — PATCH /interactions/{id} --------------------------

    @Test
    void updateReturns200WithUpdatedSummaryAndForwardsBody() {
        // Given — the service returns the updated summary
        InteractionSummary updated = new InteractionSummary(
                new InteractionId(5L), InteractionType.MENTORING, new EmployeeId(1L), new EmployeeId(2L),
                "Facilitator Name", "subject", "new", Instant.parse("2026-06-25T11:00:00Z"));
        when(interactionService.update(any(), any(), any(), any(), anyBoolean())).thenReturn(updated);
        var principal = adminPrincipal();

        // When
        var response = controller.update(5L, new UpdateInteractionRequest(InteractionType.MENTORING, "new"), principal);

        // Then — 200, body forwarded
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(updated);

        ArgumentCaptor<InteractionId> id = ArgumentCaptor.forClass(InteractionId.class);
        ArgumentCaptor<InteractionType> type = ArgumentCaptor.forClass(InteractionType.class);
        ArgumentCaptor<String> note = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<EmployeeId> actor = ArgumentCaptor.forClass(EmployeeId.class);
        verify(interactionService).update(id.capture(), type.capture(), note.capture(), actor.capture(), eq(true));
        assertThat(id.getValue()).isEqualTo(new InteractionId(5L));
        assertThat(type.getValue()).isEqualTo(InteractionType.MENTORING);
        assertThat(note.getValue()).isEqualTo("new");
    }

    @Test
    void updateForwardsNonAdminFlagForEmployeePrincipal() {
        // Given — a non-admin principal (any role other than ADMIN)
        InteractionSummary updated = new InteractionSummary(
                new InteractionId(6L), InteractionType.OTHER, new EmployeeId(1L), new EmployeeId(2L),
                "Facilitator Name", "subject", "n", Instant.parse("2026-06-25T11:00:00Z"));
        when(interactionService.update(any(), any(), any(), any(), anyBoolean())).thenReturn(updated);
        var principal = employeePrincipal("2");

        // When
        controller.update(6L, new UpdateInteractionRequest(InteractionType.OTHER, "n"), principal);

        // Then — isAdmin=false
        verify(interactionService).update(any(), any(), any(), any(), eq(false));
    }

    @Test
    void updateBindsActorIdFromPrincipalUsername() {
        // Given
        when(interactionService.update(any(), any(), any(), any(), anyBoolean()))
                .thenReturn(new InteractionSummary(
                        new InteractionId(7L), InteractionType.OTHER, new EmployeeId(1L), new EmployeeId(2L),
                        "Facilitator Name", "subject", "n", Instant.parse("2026-06-25T11:00:00Z")));
        var principal = employeePrincipal("42");

        // When
        controller.update(7L, new UpdateInteractionRequest(InteractionType.OTHER, "n"), principal);

        // Then — actor is parsed from the principal username
        ArgumentCaptor<EmployeeId> actor = ArgumentCaptor.forClass(EmployeeId.class);
        verify(interactionService).update(any(), any(), any(), actor.capture(), anyBoolean());
        assertThat(actor.getValue()).isEqualTo(new EmployeeId(42L));
    }

    @Test
    void updatePropagatesNotFoundAs404DomainException() {
        // Given — the service raises InteractionNotFoundException (covers both
        // "truly absent" and "non-owner non-admin" — collapsed to 404 by the service)
        when(interactionService.update(any(), any(), any(), any(), anyBoolean()))
                .thenThrow(new InteractionNotFoundException(99L));
        var principal = adminPrincipal();

        // When / Then
        assertThatThrownBy(() -> controller.update(99L,
                new UpdateInteractionRequest(InteractionType.OTHER, "n"), principal))
                .isInstanceOf(InteractionNotFoundException.class);
    }

    @Test
    void updateRejectsNullTypeWith400BadRequest() {
        // Given — request with null type (Jackson would normally reject unknown types,
        // but null can pass through if explicitly sent or missing from JSON)
        // No service stub needed — controller validates before calling service
        var principal = adminPrincipal();

        // When / Then — null type is rejected with 400
        assertThatThrownBy(() -> controller.update(5L,
                new UpdateInteractionRequest(null, "note"), principal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("type is required");
    }

    @Test
    void updateAcceptsCatchUpTypeSuccessfully() {
        // Given — catch-up type deserialized correctly from kebab-case JSON
        InteractionSummary updated = new InteractionSummary(
                new InteractionId(5L), InteractionType.CATCH_UP, new EmployeeId(1L), new EmployeeId(2L),
                "Facilitator Name", "subject", "updated note", Instant.parse("2026-06-25T11:00:00Z"));
        when(interactionService.update(any(), any(), any(), any(), anyBoolean())).thenReturn(updated);
        var principal = adminPrincipal();

        // When — update with catch-up type
        var response = controller.update(5L,
                new UpdateInteractionRequest(InteractionType.CATCH_UP, "updated note"), principal);

        // Then — 200 with updated summary
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(updated);
        verify(interactionService).update(any(), eq(InteractionType.CATCH_UP), any(), any(), anyBoolean());
    }

    @Test
    void updateAcceptsCheckInTypeSuccessfully() {
        // Given — check-in type deserialized correctly from kebab-case JSON
        InteractionSummary updated = new InteractionSummary(
                new InteractionId(6L), InteractionType.CHECK_IN, new EmployeeId(1L), new EmployeeId(2L),
                "Facilitator Name", "subject", "note", Instant.parse("2026-06-25T11:00:00Z"));
        when(interactionService.update(any(), any(), any(), any(), anyBoolean())).thenReturn(updated);
        var principal = adminPrincipal();

        // When — update with check-in type
        var response = controller.update(6L,
                new UpdateInteractionRequest(InteractionType.CHECK_IN, "note"), principal);

        // Then — 200 with updated summary
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(updated);
        verify(interactionService).update(any(), eq(InteractionType.CHECK_IN), any(), any(), anyBoolean());
    }

    private static User adminPrincipal() {
        return new User("1", "n/a", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private static User employeePrincipal(String username) {
        return new User(username, "n/a", List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }
}