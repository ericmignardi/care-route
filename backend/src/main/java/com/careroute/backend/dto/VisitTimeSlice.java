package com.careroute.backend.dto;

import com.careroute.backend.model.VisitStatus;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A three-column projection of a visit, used by the dashboard week chart so the
 * aggregate does not load whole visit rows it will only count.
 *
 * <p>{@code caregiverId} is the foreign key rather than the caregiver: the chart only
 * needs to know whether somebody is coming, and reading the id off the owning side
 * costs no join.
 */
public record VisitTimeSlice(LocalDateTime scheduledStart, VisitStatus status, UUID caregiverId) {

    public boolean unassigned() {
        return caregiverId == null;
    }
}
