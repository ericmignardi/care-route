package com.careroute.backend.dto;

import com.careroute.backend.model.ClientStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClientRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Size(max = 30) String phone,
        @NotBlank @Size(max = 255) String addressLine,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 10) String postalCode,
        ClientStatus status
) {
}
