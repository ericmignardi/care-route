package com.careroute.backend.dto;

import com.careroute.backend.model.Availability;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.UUID;

public record AvailabilityResponse(UUID id, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {

    public static AvailabilityResponse from(Availability availability) {
        return new AvailabilityResponse(
                availability.getId(),
                availability.getDayOfWeek(),
                availability.getStartTime(),
                availability.getEndTime()
        );
    }
}
