package com.careroute.backend.dto;

import com.careroute.backend.model.Caregiver;

import java.util.UUID;

public record CaregiverSummary(UUID id, String firstName, String lastName) {

    public static CaregiverSummary from(Caregiver caregiver) {
        if (caregiver == null) {
            return null;
        }
        return new CaregiverSummary(caregiver.getId(), caregiver.getUser().getFirstName(), caregiver.getUser().getLastName());
    }
}
