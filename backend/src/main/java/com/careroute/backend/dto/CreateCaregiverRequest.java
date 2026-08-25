package com.careroute.backend.dto;

import com.careroute.backend.model.Skill;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * FR-1.4. Creating a caregiver creates the login as well: a caregiver profile with no
 * account cannot check in, and an account with no profile cannot be assigned a visit,
 * so the two are only ever useful together.
 */
public record CreateCaregiverRequest(
        @NotBlank @Size(max = 100) String username,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Size(max = 30) String phone,
        Set<Skill> skills
) {
}
