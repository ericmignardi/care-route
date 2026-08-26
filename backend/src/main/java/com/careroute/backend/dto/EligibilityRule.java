package com.careroute.backend.dto;

/**
 * Declaration order is report order: when several rules apply, the first is the one the
 * assignment path turns into an exception, so it has to be deterministic.
 *
 * <p>{@code conflict} decides the HTTP status — a double booking collides with existing
 * state (409); the rest describe work the caregiver cannot take as specified (422).
 */
public enum EligibilityRule {

    CAREGIVER_INACTIVE(false),

    /** BR-3 — does not hold the required skill. */
    CAREGIVER_MISSING_SKILL(false),

    /** BR-2 — outside the caregiver's availability for that day. */
    CAREGIVER_UNAVAILABLE(false),

    /** BR-1 — already has a non-cancelled visit overlapping the window. */
    CAREGIVER_DOUBLE_BOOKED(true);

    private final boolean conflict;

    EligibilityRule(boolean conflict) {
        this.conflict = conflict;
    }

    public boolean isConflict() {
        return conflict;
    }
}
