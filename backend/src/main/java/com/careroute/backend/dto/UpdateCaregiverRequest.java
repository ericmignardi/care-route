package com.careroute.backend.dto;

import com.careroute.backend.model.CaregiverStatus;
import com.careroute.backend.model.Skill;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record UpdateCaregiverRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Size(max = 30) String phone,
        CaregiverStatus status,
        Set<Skill> skills
) {
}
