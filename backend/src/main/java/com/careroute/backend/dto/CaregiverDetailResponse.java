package com.careroute.backend.dto;

import com.careroute.backend.model.Availability;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.CaregiverStatus;
import com.careroute.backend.model.Skill;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

public record CaregiverDetailResponse(
        UUID id,
        UUID userId,
        String username,
        String firstName,
        String lastName,
        String phone,
        CaregiverStatus status,
        Set<Skill> skills,
        List<AvailabilityResponse> availability
) {

    public static CaregiverDetailResponse from(Caregiver caregiver) {
        return new CaregiverDetailResponse(
                caregiver.getId(),
                caregiver.getUser().getId(),
                caregiver.getUser().getUsername(),
                caregiver.getUser().getFirstName(),
                caregiver.getUser().getLastName(),
                caregiver.getPhone(),
                caregiver.getStatus(),
                new TreeSet<>(caregiver.getSkills()),
                caregiver.getAvailability().stream()
                        .sorted(Comparator.comparing(Availability::getDayOfWeek).thenComparing(Availability::getStartTime))
                        .map(AvailabilityResponse::from)
                        .toList()
        );
    }
}
