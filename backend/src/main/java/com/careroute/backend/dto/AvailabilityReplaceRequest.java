package com.careroute.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * FR-3.3. Availability is replaced wholesale rather than patched window by window;
 * the editor is a weekly grid, so a full replacement is what the user actually means
 * and it removes any need to reconcile deletions client-side.
 */
public record AvailabilityReplaceRequest(
        @NotNull @Valid List<AvailabilityRequest> windows
) {
}
