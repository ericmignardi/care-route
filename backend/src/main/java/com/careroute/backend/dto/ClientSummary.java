package com.careroute.backend.dto;

import com.careroute.backend.model.Client;

import java.util.UUID;

/**
 * The slice of a client a schedule board needs. Kept deliberately small so a visit
 * list does not drag the whole client record across the wire once per row.
 */
public record ClientSummary(UUID id, String firstName, String lastName, String city) {

    public static ClientSummary from(Client client) {
        return new ClientSummary(client.getId(), client.getFirstName(), client.getLastName(), client.getCity());
    }
}
