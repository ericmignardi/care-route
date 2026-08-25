package com.careroute.backend.dto;

/**
 * The reasons a caregiver can fail to be eligible for a visit window, in the order
 * they are reported. The order matters: when several apply, the first is the one the
 * assignment path turns into an exception, so it must be deterministic.
 *
 * <p>{@code conflict} decides the HTTP status. A double booking is a collision with
 * existing state (409); the rest describe a caregiver who simply cannot take the
 * work as specified (422).
 */
public enum EligibilityRule {

    /** The caregiver is deactivated. */
    CAREGIVER_INACTIVE(false),

    /** BR-3 — the caregiver does not hold the required skill. */
    CAREGIVER_MISSING_SKILL(false),

    /** BR-2 — the window falls outside the caregiver's availability for that day. */
    CAREGIVER_UNAVAILABLE(false),

    /** BR-1 — the caregiver already has a non-cancelled visit overlapping the window. */
    CAREGIVER_DOUBLE_BOOKED(true);

    private final boolean conflict;

    EligibilityRule(boolean conflict) {
        this.conflict = conflict;
    }

    public boolean isConflict() {
        return conflict;
    }
}
