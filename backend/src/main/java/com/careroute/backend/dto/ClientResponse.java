package com.careroute.backend.dto;

import com.careroute.backend.model.Client;
import com.careroute.backend.model.ClientStatus;

import java.time.Instant;
import java.util.UUID;

public record ClientResponse(
        UUID id,
        String firstName,
        String lastName,
        String phone,
        String addressLine,
        String city,
        String postalCode,
        ClientStatus status,
        Instant createdAt,
        Instant updatedAt
) {

    public static ClientResponse from(Client client) {
        return new ClientResponse(
                client.getId(),
                client.getFirstName(),
                client.getLastName(),
                client.getPhone(),
                client.getAddressLine(),
                client.getCity(),
                client.getPostalCode(),
                client.getStatus(),
                client.getCreatedAt(),
                client.getUpdatedAt()
        );
    }
}
