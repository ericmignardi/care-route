package com.careroute.backend.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AssignCaregiverRequest(@NotNull UUID caregiverId) {
}
