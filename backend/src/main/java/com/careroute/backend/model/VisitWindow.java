package com.careroute.backend.model;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * The half-open interval {@code [start, end)} a visit occupies. Half-open is the point: a
 * visit ending at 10:00 and one starting at 10:00 do not overlap (BR-1).
 */
public record VisitWindow(LocalDateTime start, LocalDateTime end) {

    public VisitWindow {
        if (start == null || end == null) {
            throw new IllegalArgumentException("A visit window needs both a start and an end");
        }
        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("A visit must end after it starts");
        }
    }

    public static VisitWindow of(LocalDateTime start, LocalDateTime end) {
        return new VisitWindow(start, end);
    }

    public static VisitWindow of(Visit visit) {
        return new VisitWindow(visit.getScheduledStart(), visit.getScheduledEnd());
    }

    /** True when the window sits entirely inside a single calendar day, as BR-2 requires. */
    public boolean isSameDay() {
        return start.toLocalDate().equals(end.toLocalDate());
    }

    public Duration duration() {
        return Duration.between(start, end);
    }
}
