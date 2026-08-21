package com.careroute.backend.repository;

import com.careroute.backend.model.Client;
import com.careroute.backend.model.ClientStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID>, JpaSpecificationExecutor<Client> {

    List<Client> findAllByStatusOrderByLastNameAsc(ClientStatus status);

    @Query("SELECT c FROM Client c LEFT JOIN FETCH c.carePlanTasks WHERE c.id = :id")
    Optional<Client> findByIdWithCarePlanTasks(@Param("id") UUID id);
}
