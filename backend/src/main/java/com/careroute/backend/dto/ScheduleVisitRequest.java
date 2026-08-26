package com.careroute.backend.dto;

import com.careroute.backend.model.Skill;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

/** FR-4.1. {@code caregiverId} is optional — a slot is often blocked out before it is covered. */
public record ScheduleVisitRequest(
        @NotNull UUID clientId,
        UUID caregiverId,
        @NotNull LocalDateTime scheduledStart,
        @NotNull LocalDateTime scheduledEnd,
        @NotNull Skill requiredSkill
) {
}
