package com.careroute.backend.dto;

import com.careroute.backend.model.CarePlanTask;

import java.util.UUID;

public record CarePlanTaskResponse(UUID id, String description, int sortOrder) {

    public static CarePlanTaskResponse from(CarePlanTask task) {
        return new CarePlanTaskResponse(task.getId(), task.getDescription(), task.getSortOrder());
    }
}
