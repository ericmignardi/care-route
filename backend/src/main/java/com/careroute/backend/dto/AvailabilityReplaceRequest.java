package com.careroute.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** FR-3.3. Availability is replaced wholesale, never patched window by window. */
public record AvailabilityReplaceRequest(
        @NotNull @Valid List<AvailabilityRequest> windows
) {
}
