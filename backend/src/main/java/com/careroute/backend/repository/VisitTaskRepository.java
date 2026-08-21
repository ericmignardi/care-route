package com.careroute.backend.repository;

import com.careroute.backend.model.VisitTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VisitTaskRepository extends JpaRepository<VisitTask, UUID> {

    List<VisitTask> findByVisitIdOrderBySortOrderAsc(UUID visitId);
}
