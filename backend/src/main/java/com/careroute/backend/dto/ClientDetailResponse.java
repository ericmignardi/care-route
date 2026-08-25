package com.careroute.backend.dto;

import com.careroute.backend.model.Client;
import com.careroute.backend.model.ClientStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * FR-2.3. The care plan travels with the client; visit history is paged separately
 * through {@code GET /visits?clientId=} because it grows without bound.
 */
public record ClientDetailResponse(
        UUID id,
        String firstName,
        String lastName,
        String phone,
        String addressLine,
        String city,
        String postalCode,
        ClientStatus status,
        List<CarePlanTaskResponse> carePlanTasks,
        Instant createdAt,
        Instant updatedAt
) {

    public static ClientDetailResponse from(Client client) {
        return new ClientDetailResponse(
                client.getId(),
                client.getFirstName(),
                client.getLastName(),
                client.getPhone(),
                client.getAddressLine(),
                client.getCity(),
                client.getPostalCode(),
                client.getStatus(),
                client.getCarePlanTasks().stream().map(CarePlanTaskResponse::from).toList(),
                client.getCreatedAt(),
                client.getUpdatedAt()
        );
    }
}
