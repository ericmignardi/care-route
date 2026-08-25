package com.careroute.backend.exception;

/**
 * Thrown when an entity referenced by an identifier does not exist. Mapped to 404.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " " + id + " was not found");
    }
}
