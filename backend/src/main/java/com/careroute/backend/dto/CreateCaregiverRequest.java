package com.careroute.backend.dto;

import com.careroute.backend.model.Skill;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

/** FR-1.4. Creating a caregiver creates the login too; neither half is useful alone. */
public record CreateCaregiverRequest(
        @NotBlank @Size(max = 100) String username,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Size(max = 30) String phone,
        Set<Skill> skills
) {
}
