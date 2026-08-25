package com.careroute.backend.dto;

import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.CaregiverStatus;
import com.careroute.backend.model.Skill;

import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

public record CaregiverResponse(
        UUID id,
        UUID userId,
        String username,
        String firstName,
        String lastName,
        String phone,
        CaregiverStatus status,
        Set<Skill> skills
) {

    public static CaregiverResponse from(Caregiver caregiver) {
        return new CaregiverResponse(
                caregiver.getId(),
                caregiver.getUser().getId(),
                caregiver.getUser().getUsername(),
                caregiver.getUser().getFirstName(),
                caregiver.getUser().getLastName(),
                caregiver.getPhone(),
                caregiver.getStatus(),
                new TreeSet<>(caregiver.getSkills())
        );
    }
}
