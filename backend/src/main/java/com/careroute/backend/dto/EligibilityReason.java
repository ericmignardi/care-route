package com.careroute.backend.dto;

/**
 * One reason a caregiver cannot take a visit, carrying both a machine-readable rule
 * and the human sentence the assign dialog shows beside the dimmed name.
 */
public record EligibilityReason(EligibilityRule rule, String message) {

    public static EligibilityReason of(EligibilityRule rule, String message) {
        return new EligibilityReason(rule, message);
    }
}
