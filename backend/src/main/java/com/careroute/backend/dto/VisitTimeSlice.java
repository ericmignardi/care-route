package com.careroute.backend.dto;

import com.careroute.backend.model.VisitStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record VisitTimeSlice(LocalDateTime scheduledStart, VisitStatus status, UUID caregiverId) {

    public boolean unassigned() {
        return caregiverId == null;
    }
}
