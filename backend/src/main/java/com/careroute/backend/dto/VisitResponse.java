package com.careroute.backend.dto;

import com.careroute.backend.model.Skill;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * List-shaped view of a visit. {@code caregiver} is null while the visit is unassigned,
 * which is a legitimate state (FR-4.1) rather than missing data.
 */
public record VisitResponse(
        UUID id,
        ClientSummary client,
        CaregiverSummary caregiver,
        LocalDateTime scheduledStart,
        LocalDateTime scheduledEnd,
        Skill requiredSkill,
        VisitStatus status,
        Instant checkedInAt,
        Instant checkedOutAt
) {

    public static VisitResponse from(Visit visit) {
        return new VisitResponse(
                visit.getId(),
                ClientSummary.from(visit.getClient()),
                CaregiverSummary.from(visit.getCaregiver()),
                visit.getScheduledStart(),
                visit.getScheduledEnd(),
                visit.getRequiredSkill(),
                visit.getStatus(),
                visit.getCheckedInAt(),
                visit.getCheckedOutAt()
        );
    }
}
