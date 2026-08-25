package com.careroute.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CarePlanTaskRequest(
        @NotBlank @Size(max = 255) String description,
        @PositiveOrZero Integer sortOrder
) {
}
