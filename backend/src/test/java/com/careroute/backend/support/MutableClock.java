package com.careroute.backend.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * A clock the tests can move.
 *
 * <p>BR-4 accepts a check-in only within a tolerance of the scheduled start, which is a
 * statement about the relationship between two times. Testing it against the wall clock
 * would mean scheduling a visit "about now" and hoping the assertion runs before the
 * tolerance expires. Pinning time instead makes the rule's boundaries addressable: the
 * test says exactly where "now" is and exactly where the visit is.
 */
public class MutableClock extends Clock {

    private final ZoneId zone;
    private volatile Instant instant;

    public MutableClock(ZoneId zone, Instant instant) {
        this.zone = zone;
        this.instant = instant;
    }

    /** Moves "now" to the given local time, interpreted in this clock's zone. */
    public void setNow(LocalDateTime now) {
        this.instant = now.atZone(zone).toInstant();
    }

    public void advance(Duration amount) {
        this.instant = instant.plus(amount);
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId other) {
        return new MutableClock(other, instant);
    }

    @Override
    public Instant instant() {
        return instant;
    }
}
