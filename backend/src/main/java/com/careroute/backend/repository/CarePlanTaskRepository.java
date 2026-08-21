package com.careroute.backend.repository;

import com.careroute.backend.model.CarePlanTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CarePlanTaskRepository extends JpaRepository<CarePlanTask, UUID> {

    List<CarePlanTask> findByClientIdOrderBySortOrderAsc(UUID clientId);
}
