package com.careroute.backend.exception;

import lombok.Getter;

/** A well-formed request that a domain rule leaves unprocessable. Mapped to 422. */
@Getter
public class BusinessRuleViolationException extends RuntimeException {

    private final String rule;

    public BusinessRuleViolationException(String rule, String message) {
        super(message);
        this.rule = rule;
    }
}
