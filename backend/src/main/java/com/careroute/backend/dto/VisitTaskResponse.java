package com.careroute.backend.dto;

import com.careroute.backend.model.VisitTask;

import java.time.Instant;
import java.util.UUID;

public record VisitTaskResponse(UUID id, String description, int sortOrder, boolean completed, Instant completedAt) {

    public static VisitTaskResponse from(VisitTask task) {
        return new VisitTaskResponse(
                task.getId(),
                task.getDescription(),
                task.getSortOrder(),
                task.isCompleted(),
                task.getCompletedAt()
        );
    }
}
