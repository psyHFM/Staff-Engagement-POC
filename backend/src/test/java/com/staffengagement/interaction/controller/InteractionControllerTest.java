package com.staffengagement.interaction.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.staffengagement.interaction.controller.dto.CreateInteractionRequest;
import com.staffengagement.interaction.service.InteractionNotFoundException;
import com.staffengagement.interaction.service.InteractionService;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.api.PageRequest;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.shared.kernel.InteractionType;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

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
                new InteractionId(42L), InteractionType.CHECK_IN, new EmployeeId(1L), new EmployeeId(2L), "note");
        when(interactionService.create(any(), any(), any(), any())).thenReturn(created);

        // When
        var response = controller.create(
                new CreateInteractionRequest(InteractionType.CHECK_IN, new EmployeeId(1L), new EmployeeId(2L), "note"));

        // Then — 201 with the unwrapped summary, body forwarded to the service
        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isEqualTo(created);

        ArgumentCaptor<InteractionType> type = ArgumentCaptor.forClass(InteractionType.class);
        ArgumentCaptor<EmployeeId> subject = ArgumentCaptor.forClass(EmployeeId.class);
        ArgumentCaptor<EmployeeId> facilitator = ArgumentCaptor.forClass(EmployeeId.class);
        ArgumentCaptor<String> note = ArgumentCaptor.forClass(String.class);
        verify(interactionService).create(type.capture(), subject.capture(), facilitator.capture(), note.capture());
        assertThat(type.getValue()).isEqualTo(InteractionType.CHECK_IN);
        assertThat(subject.getValue()).isEqualTo(new EmployeeId(1L));
        assertThat(facilitator.getValue()).isEqualTo(new EmployeeId(2L));
        assertThat(note.getValue()).isEqualTo("note");
    }

    @Test
    void listBySubjectReturnsPagedResultAndBindsSubjectOffsetAndLimit() {
        // Given — the service returns a page of one interaction
        InteractionSummary summary = new InteractionSummary(
                new InteractionId(7L), InteractionType.MENTORING, new EmployeeId(1L), new EmployeeId(2L), "n");
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
                new InteractionId(5L), InteractionType.CATCH_UP, new EmployeeId(1L), new EmployeeId(2L), "x");
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
}