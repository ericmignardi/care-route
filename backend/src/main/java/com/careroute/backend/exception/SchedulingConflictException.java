package com.careroute.backend.exception;

import lombok.Getter;

/** A request that collides with the current state of the schedule. Mapped to 409. */
@Getter
public class SchedulingConflictException extends RuntimeException {

    private final String rule;

    public SchedulingConflictException(String rule, String message) {
        super(message);
        this.rule = rule;
    }
}
