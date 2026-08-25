package com.careroute.backend.exception;

import lombok.Getter;

/**
 * Thrown when a request collides with the current state of the schedule: a double
 * booking, an illegal lifecycle transition, or a check-in outside its tolerance.
 * Mapped to 409.
 */
@Getter
public class SchedulingConflictException extends RuntimeException {

    private final String rule;

    public SchedulingConflictException(String rule, String message) {
        super(message);
        this.rule = rule;
    }
}
