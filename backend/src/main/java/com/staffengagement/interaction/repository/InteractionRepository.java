package com.staffengagement.interaction.repository;

import com.staffengagement.interaction.domain.Interaction;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Persistence port for the Interaction module.
 *
 * <p>Two read shapes:
 * <ul>
 *   <li>{@link #findBySubjectIdOrFacilitatorIdOrderByCreatedAtDesc(Long, Long)} — the full ordered list
 *       backing the frozen {@code InteractionContract.findBySubject} (Phase 6
 *       consumes this via the service).</li>
 *   <li>{@link #findBySubjectIdOrFacilitatorId(Long, Long, Pageable)} — the paginated read backing
 *       {@code GET /api/v1/employees/{id}/interactions}; ordering comes from the
 *       {@link Pageable#getSort()} (default {@code createdAt,desc}, set by the
 *       service), so no {@code OrderBy} is baked into the method name.</li>
 * </ul>
 *
 * <p>ATSE1-83 adds archive/delete filtering:
 * <ul>
 *   <li>{@link #findBySubjectIdAndNotDeleted} — filters out deleted interactions for a subject</li>
 *   <li>{@link #findByFacilitatorIdAndNotDeleted} — filters out deleted interactions for a facilitator</li>
 * </ul>
 */
public interface InteractionRepository extends JpaRepository<Interaction, Long> {

    List<Interaction> findBySubjectIdOrFacilitatorIdOrderByCreatedAtDesc(Long subjectId, Long facilitatorId);

    Page<Interaction> findBySubjectIdOrFacilitatorId(Long subjectId, Long facilitatorId, Pageable pageable);

    /**
     * Find interactions for a subject, excluding those deleted by the subject.
     * Optionally includes or excludes archived interactions.
     */
    @Query("SELECT i FROM Interaction i WHERE i.subjectId = :subjectId " +
           "AND i.deletedBySubject = false " +
           "AND (:includeArchived = true OR i.archivedBySubject = false)")
    Page<Interaction> findBySubjectIdAndNotDeleted(
        @Param("subjectId") Long subjectId,
        @Param("includeArchived") boolean includeArchived,
        Pageable pageable);

    /**
     * Find interactions for a facilitator, excluding those deleted by the facilitator.
     * Optionally includes or excludes archived interactions.
     */
    @Query("SELECT i FROM Interaction i WHERE i.facilitatorId = :facilitatorId " +
           "AND i.deletedByFacilitator = false " +
           "AND (:includeArchived = true OR i.archivedByFacilitator = false)")
    Page<Interaction> findByFacilitatorIdAndNotDeleted(
        @Param("facilitatorId") Long facilitatorId,
        @Param("includeArchived") boolean includeArchived,
        Pageable pageable);
}
