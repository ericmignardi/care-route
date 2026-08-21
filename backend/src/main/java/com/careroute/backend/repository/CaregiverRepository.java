package com.careroute.backend.repository;

import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.CaregiverStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CaregiverRepository extends JpaRepository<Caregiver, UUID> {

    Optional<Caregiver> findByUserId(UUID userId);

    Optional<Caregiver> findByUserUsername(String username);

    @EntityGraph(attributePaths = {"user", "skills"})
    Page<Caregiver> findByStatus(CaregiverStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "skills"})
    List<Caregiver> findAllByStatus(CaregiverStatus status);

    @Query("SELECT c FROM Caregiver c LEFT JOIN FETCH c.user LEFT JOIN FETCH c.skills WHERE c.id = :id")
    Optional<Caregiver> findByIdWithDetails(@Param("id") UUID id);
}
