package com.staffengagement.interaction.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.staffengagement.interaction.domain.Interaction;
import com.staffengagement.interaction.repository.InteractionRepository;
import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.api.PageRequest;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.kernel.EmployeeId;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;

/**
 * BDD unit tests for {@link InteractionService}. The repository and the frozen
 * {@link EmployeeContract} are mocked — no database, no Spring context (per
 * {@code testing-strategy.yaml}: unit tests only).
 */
@ExtendWith(MockitoExtension.class)
class InteractionServiceTest {

    private static final EmployeeId SUBJECT = new EmployeeId(1L);
    private static final EmployeeId FACILITATOR = new EmployeeId(2L);

    @Mock
    private InteractionRepository repository;

    @Mock
    private EmployeeContract employeeContract;

    @InjectMocks
    private InteractionService service;

    @Test
    void createPersistsAndReturnsSummaryForValidSubjectAndFacilitator() {
        // Given — subject and facilitator both exist, and save assigns an id
        when(employeeContract.exists(SUBJECT)).thenReturn(true);
        when(employeeContract.exists(FACILITATOR)).thenReturn(true);
        when(repository.save(any(Interaction.class))).thenAnswer(inv -> {
            Interaction entity = inv.getArgument(0);
            entity.setId(42L);
            return entity;
        });

        // When
        InteractionSummary result = service.create(InteractionType.CHECK_IN, SUBJECT, FACILITATOR, "great chat");

        // Then — the persisted entity carries the right fields and the summary echoes them
        ArgumentCaptor<Interaction> captor = ArgumentCaptor.forClass(Interaction.class);
        verify(repository).save(captor.capture());
        Interaction saved = captor.getValue();
        assertThat(saved.getType()).isEqualTo(InteractionType.CHECK_IN);
        assertThat(saved.getSubjectId()).isEqualTo(1L);
        assertThat(saved.getFacilitatorId()).isEqualTo(2L);
        assertThat(saved.getNote()).isEqualTo("great chat");
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isEqualTo(saved.getCreatedAt());

        assertThat(result.id()).isEqualTo(new InteractionId(42L));
        assertThat(result.type()).isEqualTo(InteractionType.CHECK_IN);
        assertThat(result.subject()).isEqualTo(SUBJECT);
        assertThat(result.facilitator()).isEqualTo(FACILITATOR);
        assertThat(result.note()).isEqualTo("great chat");
    }

    @Test
    void createRejectsUnknownSubjectWith404DomainExceptionAndDoesNotPersist() {
        // Given — the subject employee does not exist
        when(employeeContract.exists(SUBJECT)).thenReturn(false);

        // When / Then
        assertThatThrownBy(() -> service.create(InteractionType.MENTORING, SUBJECT, FACILITATOR, "x"))
                .isInstanceOf(SubjectNotFoundException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void createRejectsUnknownFacilitatorWith404DomainExceptionAndDoesNotPersist() {
        // Given — subject exists but the facilitator does not
        when(employeeContract.exists(SUBJECT)).thenReturn(true);
        when(employeeContract.exists(FACILITATOR)).thenReturn(false);

        // When / Then
        assertThatThrownBy(() -> service.create(InteractionType.MENTORING, SUBJECT, FACILITATOR, "x"))
                .isInstanceOf(FacilitatorNotFoundException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void createRejectsMissingTypeAsValidation400() {
        // Given / When / Then — null type never reaches the contract check
        assertThatThrownBy(() -> service.create(null, SUBJECT, FACILITATOR, "x"))
                .isInstanceOf(IllegalArgumentException.class);
        verify(employeeContract, never()).exists(any());
        verify(repository, never()).save(any());
    }

    @Test
    void createRejectsMissingSubjectAsValidation400() {
        assertThatThrownBy(() -> service.create(InteractionType.CATCH_UP, null, FACILITATOR, "x"))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void createRejectsMissingFacilitatorAsValidation400() {
        assertThatThrownBy(() -> service.create(InteractionType.CATCH_UP, SUBJECT, null, "x"))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void findBySubjectReturnsSummariesOrderedAsTheRepositoryProvides() {
        // Given — the repository returns interactions newest-first
        Interaction first = interaction(10L, InteractionType.CHECK_IN, 1L, 2L, "first");
        Interaction second = interaction(11L, InteractionType.MENTORING, 1L, 3L, "second");
        when(repository.findBySubjectIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(first, second));

        // When
        List<InteractionSummary> result = service.findBySubject(SUBJECT);

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(new InteractionId(10L));
        assertThat(result.get(1).id()).isEqualTo(new InteractionId(11L));
        assertThat(result).allSatisfy(s -> assertThat(s.subject()).isEqualTo(SUBJECT));
    }

    @Test
    void findBySubjectReturnsEmptyListWhenNoneExist() {
        // Given
        when(repository.findBySubjectIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());

        // When
        List<InteractionSummary> result = service.findBySubject(SUBJECT);

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    void findPageBySubjectHonoursOffsetLimitAndSortAndEchoesTotal() {
        // Given — two interactions for the subject; a page window of offset 0 / limit 20 returns both
        Interaction a = interaction(10L, InteractionType.CHECK_IN, 1L, 2L, "a");
        Interaction b = interaction(11L, InteractionType.OTHER, 1L, 3L, "b");
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        when(repository.findBySubjectId(any(Long.class), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(a, b), org.springframework.data.domain.PageRequest.of(0, 20, sort), 2L));

        // When
        Paged<InteractionSummary> page = service.findPageBySubject(SUBJECT, PageRequest.of(0, 20), sort);

        // Then — the Pageable handed to the repository carries the true offset/limit/sort
        ArgumentCaptor<org.springframework.data.domain.Pageable> captor =
                ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
        verify(repository).findBySubjectId(any(Long.class), captor.capture());
        org.springframework.data.domain.Pageable passed = captor.getValue();
        assertThat(passed.getOffset()).isZero();
        assertThat(passed.getPageSize()).isEqualTo(20);
        assertThat(passed.getSort()).isEqualTo(sort);

        // And the returned Paged echoes offset/limit/total and carries the summaries
        assertThat(page.content()).hasSize(2);
        assertThat(page.offset()).isZero();
        assertThat(page.limit()).isEqualTo(20);
        assertThat(page.total()).isEqualTo(2L);
    }

    @Test
    void findPageBySubjectWithOffsetBeyondDataReturnsEmptyWindow() {
        // Given — page offset 20 / limit 20 over 2 total rows
        when(repository.findBySubjectId(any(Long.class), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), org.springframework.data.domain.PageRequest.of(1, 20), 2L));

        // When
        Paged<InteractionSummary> page = service.findPageBySubject(SUBJECT, PageRequest.of(20, 20), Sort.unsorted());

        // Then
        assertThat(page.content()).isEmpty();
        assertThat(page.offset()).isEqualTo(20);
        assertThat(page.limit()).isEqualTo(20);
        assertThat(page.total()).isEqualTo(2L);
    }

    @Test
    void findByIdReturnsSummaryWhenPresent() {
        // Given
        Interaction entity = interaction(7L, InteractionType.PERFORMANCE, 1L, 2L, "review");
        when(repository.findById(7L)).thenReturn(Optional.of(entity));

        // When
        Optional<InteractionSummary> result = service.findById(new InteractionId(7L));

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().id()).isEqualTo(new InteractionId(7L));
        assertThat(result.get().type()).isEqualTo(InteractionType.PERFORMANCE);
    }

    @Test
    void findByIdReturnsEmptyWhenAbsent() {
        // Given
        when(repository.findById(99L)).thenReturn(Optional.empty());

        // When
        Optional<InteractionSummary> result = service.findById(new InteractionId(99L));

        // Then
        assertThat(result).isEmpty();
    }

    // ---- ATSE1-28 — update(type, note) --------------------------------

    @Test
    void updateChangesTypeAndNoteForAdminWithoutTouchingAuditFields() {
        // Given — an existing interaction with subject=1, facilitator=2
        Interaction existing = interaction(10L, InteractionType.CHECK_IN, 1L, 2L, "old note");
        Instant originalCreatedAt = existing.getCreatedAt();
        Instant originalUpdatedAt = existing.getUpdatedAt();
        when(repository.findById(10L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Interaction.class))).thenAnswer(inv -> inv.getArgument(0));

        // When — admin updates type + note
        InteractionSummary result = service.update(
                new InteractionId(10L), InteractionType.MENTORING, "new note",
                new EmployeeId(99L), true);

        // Then — type and note change, subject/facilitator/createdAt stay, updatedAt advances
        ArgumentCaptor<Interaction> captor = ArgumentCaptor.forClass(Interaction.class);
        verify(repository).save(captor.capture());
        Interaction saved = captor.getValue();
        assertThat(saved.getType()).isEqualTo(InteractionType.MENTORING);
        assertThat(saved.getNote()).isEqualTo("new note");
        assertThat(saved.getSubjectId()).isEqualTo(1L);
        assertThat(saved.getFacilitatorId()).isEqualTo(2L);
        assertThat(saved.getCreatedAt()).isEqualTo(originalCreatedAt);
        assertThat(saved.getUpdatedAt()).isAfterOrEqualTo(originalUpdatedAt);

        assertThat(result.type()).isEqualTo(InteractionType.MENTORING);
        assertThat(result.note()).isEqualTo("new note");
        assertThat(result.subject()).isEqualTo(new EmployeeId(1L));
        assertThat(result.facilitator()).isEqualTo(new EmployeeId(2L));
    }

    @Test
    void updateAllowsOriginalFacilitatorAndRejectsOtherActorWith404() {
        // Given — facilitator=2; actor=3 is neither admin nor the facilitator
        Interaction existing = interaction(11L, InteractionType.CATCH_UP, 1L, 2L, "n");
        when(repository.findById(11L)).thenReturn(Optional.of(existing));

        // When / Then — non-admin, non-facilitator gets 404 (no existence leak)
        assertThatThrownBy(() -> service.update(
                new InteractionId(11L), InteractionType.OTHER, "x",
                new EmployeeId(3L), false))
                .isInstanceOf(InteractionNotFoundException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void updateReturns404WhenInteractionDoesNotExist() {
        // Given
        when(repository.findById(404L)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> service.update(
                new InteractionId(404L), InteractionType.OTHER, "x",
                new EmployeeId(2L), true))
                .isInstanceOf(InteractionNotFoundException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void updateRejectsNullTypeAsValidation400() {
        // Given — an existing interaction is fetched before the null-type check
        Interaction existing = interaction(12L, InteractionType.PERFORMANCE, 1L, 2L, "n");
        when(repository.findById(12L)).thenReturn(Optional.of(existing));

        // When / Then — null type rejects at the validation boundary
        assertThatThrownBy(() -> service.update(
                new InteractionId(12L), null, "x",
                new EmployeeId(2L), true))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    // ---- ATSE1-28 — verifyEditable contract ---------------------------

    @Test
    void verifyEditableReturnsIdForAdmin() {
        // Given
        Interaction existing = interaction(20L, InteractionType.CHECK_IN, 1L, 2L, "n");
        when(repository.findById(20L)).thenReturn(Optional.of(existing));

        // When — admin
        Optional<InteractionId> result = service.verifyEditable(
                new InteractionId(20L), new EmployeeId(99L), true);

        // Then
        assertThat(result).contains(new InteractionId(20L));
    }

    @Test
    void verifyEditableReturnsIdForOriginalFacilitator() {
        // Given
        Interaction existing = interaction(21L, InteractionType.CHECK_IN, 1L, 2L, "n");
        when(repository.findById(21L)).thenReturn(Optional.of(existing));

        // When — non-admin actor IS the facilitator
        Optional<InteractionId> result = service.verifyEditable(
                new InteractionId(21L), new EmployeeId(2L), false);

        // Then
        assertThat(result).contains(new InteractionId(21L));
    }

    @Test
    void verifyEditableReturnsEmptyForNonAdminNonFacilitator() {
        // Given
        Interaction existing = interaction(22L, InteractionType.CHECK_IN, 1L, 2L, "n");
        when(repository.findById(22L)).thenReturn(Optional.of(existing));

        // When — non-admin actor is NOT the facilitator
        Optional<InteractionId> result = service.verifyEditable(
                new InteractionId(22L), new EmployeeId(3L), false);

        // Then — existence opaque: same shape as "not found"
        assertThat(result).isEmpty();
    }

    @Test
    void verifyEditableReturnsEmptyWhenInteractionAbsent() {
        // Given
        when(repository.findById(404L)).thenReturn(Optional.empty());

        // When
        Optional<InteractionId> result = service.verifyEditable(
                new InteractionId(404L), new EmployeeId(2L), true);

        // Then
        assertThat(result).isEmpty();
    }

    private static Interaction interaction(long id, InteractionType type, long subjectId, long facilitatorId, String note) {
        Interaction entity = new Interaction();
        entity.setId(id);
        entity.setType(type);
        entity.setSubjectId(subjectId);
        entity.setFacilitatorId(facilitatorId);
        entity.setNote(note);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        return entity;
    }
}