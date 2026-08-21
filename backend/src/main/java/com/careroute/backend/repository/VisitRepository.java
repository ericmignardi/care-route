package com.careroute.backend.repository;

import com.careroute.backend.model.Visit;
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
            WHERE v.caregiver.id = :caregiverId
              AND v.status <> com.careroute.backend.model.VisitStatus.CANCELLED
              AND (:excludedVisitId IS NULL OR v.id <> :excludedVisitId)
              AND v.scheduledStart < :end
              AND v.scheduledEnd > :start
            ORDER BY v.scheduledStart ASC
            """)
    List<Visit> findOverlapping(@Param("caregiverId") UUID caregiverId,
                               @Param("start") LocalDateTime start,
                               @Param("end") LocalDateTime end,
                               @Param("excludedVisitId") UUID excludedVisitId);

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
    List<Visit> findByCaregiverIdAndScheduledStartBetweenOrderByScheduledStartAsc(UUID caregiverId,
                                                                                  LocalDateTime start,
                                                                                  LocalDateTime end);

    @Query("SELECT v FROM Visit v LEFT JOIN FETCH v.tasks WHERE v.id = :id")
    Optional<Visit> findByIdWithTasks(@Param("id") UUID id);
}
