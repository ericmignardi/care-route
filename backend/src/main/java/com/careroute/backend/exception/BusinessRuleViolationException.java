package com.careroute.backend.exception;

import lombok.Getter;

/**
 * Thrown when a request is well-formed but violates a domain rule that leaves the
 * request unprocessable rather than merely conflicting with existing state.
 * Mapped to 422. Carries the rule identifier so the client can branch on it.
 */
@Getter
public class BusinessRuleViolationException extends RuntimeException {

    private final String rule;

    public BusinessRuleViolationException(String rule, String message) {
        super(message);
        this.rule = rule;
    }
}
