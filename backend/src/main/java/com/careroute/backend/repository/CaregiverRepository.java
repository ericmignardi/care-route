package com.careroute.backend.repository;

import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.CaregiverStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CaregiverRepository extends JpaRepository<Caregiver, UUID>, JpaSpecificationExecutor<Caregiver> {

    Optional<Caregiver> findByUserId(UUID userId);

    Optional<Caregiver> findByUserUsername(String username);

    /**
     * The candidate pool for {@code /visits/eligible-caregivers}. Unpaginated by design —
     * the screen shows every caregiver, eligible or not — so fetching the skills collection
     * here costs one join rather than forcing in-memory pagination.
     */
    @EntityGraph(attributePaths = {"user", "skills"})
    List<Caregiver> findAllByStatus(CaregiverStatus status);

    /**
     * Skills and availability are left to batch fetching rather than joined here: two
     * collection joins in one query multiply the rows against each other.
     */
    @Query("SELECT c FROM Caregiver c JOIN FETCH c.user WHERE c.id = :id")
    Optional<Caregiver> findByIdWithUser(@Param("id") UUID id);
}
