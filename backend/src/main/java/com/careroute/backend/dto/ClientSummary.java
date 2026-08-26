package com.careroute.backend.dto;

import com.careroute.backend.model.Client;

import java.util.UUID;

public record ClientSummary(UUID id, String firstName, String lastName, String city) {

    public static ClientSummary from(Client client) {
        return new ClientSummary(client.getId(), client.getFirstName(), client.getLastName(), client.getCity());
    }
}
