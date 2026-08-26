package com.careroute.backend.dto;

import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.Skill;

import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

/** FR-3.4. Ineligible caregivers are returned, not filtered out, each carrying its reasons. */
public record CaregiverEligibilityResponse(
        UUID caregiverId,
        String firstName,
        String lastName,
        Set<Skill> skills,
        boolean eligible,
        List<EligibilityReason> reasons
) {

    public static CaregiverEligibilityResponse from(Caregiver caregiver, EligibilityResult result) {
        return new CaregiverEligibilityResponse(
                caregiver.getId(),
                caregiver.getUser().getFirstName(),
                caregiver.getUser().getLastName(),
                new TreeSet<>(caregiver.getSkills()),
                result.eligible(),
                result.reasons()
        );
    }
}
