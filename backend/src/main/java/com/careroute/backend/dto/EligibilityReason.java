package com.careroute.backend.dto;

public record EligibilityReason(EligibilityRule rule, String message) {

    public static EligibilityReason of(EligibilityRule rule, String message) {
        return new EligibilityReason(rule, message);
    }
}
