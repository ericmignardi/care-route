package com.careroute.backend.dto;

import com.careroute.backend.model.VisitStatus;

import java.time.LocalDateTime;

/**
 * A two-column projection of a visit, used by the dashboard week chart so the
 * aggregate does not load whole visit rows it will only count.
 */
public record VisitTimeSlice(LocalDateTime scheduledStart, VisitStatus status) {
}
