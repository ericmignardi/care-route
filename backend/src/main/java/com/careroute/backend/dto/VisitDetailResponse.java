package com.careroute.backend.dto;

import com.careroute.backend.model.Skill;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * FR-4.7. Carries {@code version} so a client can round-trip it and let BR-8 detect
 * a concurrent edit rather than silently losing one.
 */
public record VisitDetailResponse(
        UUID id,
        ClientSummary client,
        CaregiverSummary caregiver,
        LocalDateTime scheduledStart,
        LocalDateTime scheduledEnd,
        Skill requiredSkill,
        VisitStatus status,
        Instant checkedInAt,
        Instant checkedOutAt,
        String notes,
        List<VisitTaskResponse> tasks,
        int version,
        Instant createdAt,
        Instant updatedAt
) {

    public static VisitDetailResponse from(Visit visit) {
        return new VisitDetailResponse(
                visit.getId(),
                ClientSummary.from(visit.getClient()),
                CaregiverSummary.from(visit.getCaregiver()),
                visit.getScheduledStart(),
                visit.getScheduledEnd(),
                visit.getRequiredSkill(),
                visit.getStatus(),
                visit.getCheckedInAt(),
                visit.getCheckedOutAt(),
                visit.getNotes(),
                visit.getTasks().stream().map(VisitTaskResponse::from).toList(),
                visit.getVersion(),
                visit.getCreatedAt(),
                visit.getUpdatedAt()
        );
    }
}
