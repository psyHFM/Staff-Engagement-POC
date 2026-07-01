package com.staffengagement.interaction.repository;

import com.staffengagement.interaction.domain.Interaction;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Persistence port for the Interaction module.
 *
 * <p>Two read shapes:
 * <ul>
 *   <li>{@link #findBySubjectIdOrderByCreatedAtDesc(Long)} — the full ordered list
 *       backing the frozen {@code InteractionContract.findBySubject} (Phase 6
 *       consumes this via the service).</li>
 *   <li>{@link #findBySubjectId(Long, Pageable)} — the paginated read backing
 *       {@code GET /api/v1/employees/{id}/interactions}; ordering comes from the
 *       {@link Pageable#getSort()} (default {@code createdAt,desc}, set by the
 *       service), so no {@code OrderBy} is baked into the method name.</li>
 * </ul>
 */
public interface InteractionRepository extends JpaRepository<Interaction, Long> {

    List<Interaction> findBySubjectIdOrFacilitatorIdOrderByCreatedAtDesc(Long subjectId, Long facilitatorId);

    Page<Interaction> findBySubjectIdOrFacilitatorId(Long subjectId, Long facilitatorId, Pageable pageable);
}