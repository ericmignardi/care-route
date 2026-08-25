package com.careroute.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VisitNoteRequest(@NotBlank @Size(max = 2000) String notes) {
}
