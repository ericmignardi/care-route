package com.careroute.backend.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " " + id + " was not found");
    }
}
