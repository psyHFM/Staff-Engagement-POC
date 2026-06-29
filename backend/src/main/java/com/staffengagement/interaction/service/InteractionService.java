package com.staffengagement.interaction.service;

import com.staffengagement.interaction.domain.Interaction;
import com.staffengagement.interaction.repository.InteractionRepository;
import com.staffengagement.interaction.repository.OffsetPageRequest;
import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.InteractionContract;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.api.PageRequest;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.shared.kernel.InteractionType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/**
 * Interaction service — the single implementor of the frozen
 * {@link InteractionContract} and the orchestration point for the module's
 * write/read paths (Controller → Service → Repository; the controller never
 * touches the repository).
 *
 * <p>Cross-module access is exclusively through the frozen
 * {@link EmployeeContract} ({@code exists}) for subject/facilitator validation;
 * no Employee module impl/repository/domain is imported (ArchUnit-enforced).
 *
 * <p>Facilitator is <strong>required</strong> in the request body in this splice;
 * the "default to the logged-in user" behaviour is deferred (design D3) because
 * the Phase 0 principal is a username with no {@code EmployeeId} mapping.
 */
@Service
@RequiredArgsConstructor
public class InteractionService implements InteractionContract {

    private final InteractionRepository repository;
    private final EmployeeContract employeeContract;

    @Override
    public List<InteractionSummary> findBySubject(EmployeeId subject) {
        return repository.findBySubjectIdOrderByCreatedAtDesc(subject.value())
                .stream()
                .map(InteractionService::toSummary)
                .toList();
    }

    /**
     * Paginated, controller-facing read. Returns a {@link Paged} window of
     * interactions recorded against {@code subject}, ordered by the supplied
     * {@link Sort} (default {@code createdAt,desc} from the controller). The
     * frozen {@link InteractionContract#findBySubject(EmployeeId)} returns the
     * full list and is not modified (Phase 6 consumes it).
     */
    public Paged<InteractionSummary> findPageBySubject(EmployeeId subject, PageRequest request, Sort sort) {
        Pageable pageable = new OffsetPageRequest(request.offset(), request.limit(), sort);
        Page<Interaction> page = repository.findBySubjectId(subject.value(), pageable);
        List<InteractionSummary> content = page.getContent().stream()
                .map(InteractionService::toSummary)
                .toList();
        return new Paged<>(content, request.offset(), request.limit(), page.getTotalElements());
    }

    /**
     * Create an interaction. Validates that {@code type}, {@code subject}, and
     * {@code facilitator} are present (400 via {@code IllegalArgumentException})
     * and that {@code subject}/{@code facilitator} reference existing employees
     * (404 via {@link SubjectNotFoundException}/{@link FacilitatorNotFoundException}).
     * {@code type} is already constrained to the frozen vocabulary by Jackson
     * deserialization before reaching this method.
     */
    public InteractionSummary create(InteractionType type, EmployeeId subject, EmployeeId facilitator, String note) {
        if (type == null) {
            throw new IllegalArgumentException("type is required");
        }
        if (subject == null) {
            throw new IllegalArgumentException("subject is required");
        }
        if (facilitator == null) {
            throw new IllegalArgumentException("facilitator is required");
        }
        if (!employeeContract.exists(subject)) {
            throw new SubjectNotFoundException(subject.value());
        }
        if (!employeeContract.exists(facilitator)) {
            throw new FacilitatorNotFoundException(facilitator.value());
        }

        Interaction entity = new Interaction();
        entity.setType(type);
        entity.setSubjectId(subject.value());
        entity.setFacilitatorId(facilitator.value());
        entity.setNote(note);
        Instant now = Instant.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        Interaction saved = repository.save(entity);
        return toSummary(saved);
    }

    public Optional<InteractionSummary> findById(InteractionId id) {
        return repository.findById(id.value()).map(InteractionService::toSummary);
    }

    /**
     * Update an interaction's mutable fields ({@code type}, {@code note}).
     *
     * <p>Subject, facilitator and {@code createdAt} are immutable to keep the
     * audit trail honest — those fields are part of the "what happened" record,
     * not the "what was the latest edit" record. Editing the {@code type} or
     * {@code note} is a correction of the same event, so it remains the same
     * event id and timestamp; only {@code updatedAt} advances.
     *
     * <p>RBAC: admins may edit any interaction; non-admins may only edit
     * interactions they facilitated. The 404-on-unauthorised policy prevents
     * the existence leak a 403 would expose.
     *
     * @throws InteractionNotFoundException if the id does not exist, OR if a
     *         non-admin tries to edit an interaction they did not facilitate.
     *         Both paths collapse to 404 to keep existence opaque.
     */
    public InteractionSummary update(InteractionId id, InteractionType type, String note,
                                     EmployeeId actor, boolean isAdmin) {
        Interaction entity = repository.findById(id.value())
                .orElseThrow(() -> new InteractionNotFoundException(id.value()));
        if (!isAdmin && !entity.getFacilitatorId().equals(actor.value())) {
            // Collapse "not yours" into "not found" — no existence leak.
            throw new InteractionNotFoundException(id.value());
        }
        if (type == null) {
            throw new IllegalArgumentException("type is required");
        }
        entity.setType(type);
        entity.setNote(note);
        entity.setUpdatedAt(Instant.now());
        Interaction saved = repository.save(entity);
        return toSummary(saved);
    }

    /**
     * Override of the additive {@link InteractionContract#verifyEditable} default.
     * Returns the {@link InteractionId} if the actor is allowed to edit, or empty
     * for both "not found" and "not authorised" (existence opaque).
     */
    @Override
    public Optional<InteractionId> verifyEditable(InteractionId id, EmployeeId actor, boolean isAdmin) {
        return repository.findById(id.value())
                .filter(entity -> isAdmin || entity.getFacilitatorId().equals(actor.value()))
                .map(entity -> id);
    }

    private static InteractionSummary toSummary(Interaction entity) {
        return new InteractionSummary(
                new InteractionId(entity.getId()),
                entity.getType(),
                new EmployeeId(entity.getSubjectId()),
                new EmployeeId(entity.getFacilitatorId()),
                entity.getNote(),
                entity.getCreatedAt());
    }
}