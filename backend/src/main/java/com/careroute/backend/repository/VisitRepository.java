package com.careroute.backend.repository;

import com.careroute.backend.dto.VisitTimeSlice;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VisitRepository extends JpaRepository<Visit, UUID>, JpaSpecificationExecutor<Visit> {

    @Query("""
            SELECT v FROM Visit v
            WHERE v.caregiver.id IN :caregiverIds
              AND v.status <> com.careroute.backend.model.VisitStatus.CANCELLED
              AND (:excludedVisitId IS NULL OR v.id <> :excludedVisitId)
              AND v.scheduledStart < :end
              AND v.scheduledEnd > :start
            ORDER BY v.scheduledStart ASC
            """)
    List<Visit> findOverlappingForCaregivers(@Param("caregiverIds") Collection<UUID> caregiverIds,
                                             @Param("start") LocalDateTime start,
                                             @Param("end") LocalDateTime end,
                                             @Param("excludedVisitId") UUID excludedVisitId);

    @EntityGraph(attributePaths = {"client", "caregiver", "caregiver.user"})
    List<Visit> findByCaregiverIdAndScheduledStartGreaterThanEqualAndScheduledStartLessThanOrderByScheduledStartAsc(
            UUID caregiverId, LocalDateTime start, LocalDateTime end);

    @Query("SELECT v FROM Visit v LEFT JOIN FETCH v.tasks WHERE v.id = :id")
    Optional<Visit> findByIdWithTasks(@Param("id") UUID id);

    /**
     * Everything the detail view renders, in one query. The collection join is safe because a
     * single row is being loaded, so there is nothing to paginate in memory.
     */
    @Query("""
            SELECT v FROM Visit v
            LEFT JOIN FETCH v.client
            LEFT JOIN FETCH v.caregiver c
            LEFT JOIN FETCH c.user
            LEFT JOIN FETCH v.tasks
            WHERE v.id = :id
            """)
    Optional<Visit> findByIdWithDetails(@Param("id") UUID id);

    long countByScheduledStartGreaterThanEqualAndScheduledStartLessThan(LocalDateTime start, LocalDateTime end);

    long countByStatus(VisitStatus status);

    long countByCaregiverIsNullAndStatusAndScheduledStartGreaterThanEqual(VisitStatus status, LocalDateTime from);

    /** FR-6.3 — the actionable list on the dashboard. */
    @EntityGraph(attributePaths = {"client"})
    List<Visit> findByCaregiverIsNullAndStatusAndScheduledStartGreaterThanEqualOrderByScheduledStartAsc(
            VisitStatus status, LocalDateTime from, Pageable pageable);

    /** FR-6.2 — three columns rather than whole rows, since the chart only counts. */
    @Query("""
            SELECT new com.careroute.backend.dto.VisitTimeSlice(v.scheduledStart, v.status, v.caregiver.id)
            FROM Visit v
            WHERE v.scheduledStart >= :start AND v.scheduledStart < :end
            """)
    List<VisitTimeSlice> findTimeSlicesBetween(@Param("start") LocalDateTime start,
                                               @Param("end") LocalDateTime end);
}
