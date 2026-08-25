package com.careroute.backend.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link VisitWindow} is where "a visit must end after it starts" is enforced once, so that
 * no scheduling path has to remember to check it.
 */
class VisitWindowTest {

    private static final LocalDateTime TEN = LocalDateTime.of(2026, 9, 1, 10, 0);

    @Test
    @DisplayName("a window with a positive duration is accepted")
    void aWindowWithAPositiveDurationIsAccepted() {
        VisitWindow window = VisitWindow.of(TEN, TEN.plusHours(1));

        assertThat(window.duration()).isEqualTo(Duration.ofHours(1));
        assertThat(window.isSameDay()).isTrue();
    }

    @Test
    @DisplayName("a window that ends before it starts is rejected")
    void aBackwardsWindowIsRejected() {
        assertThatThrownBy(() -> VisitWindow.of(TEN, TEN.minusMinutes(1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must end after it starts");
    }

    @Test
    @DisplayName("a zero-length window is rejected")
    void aZeroLengthWindowIsRejected() {
        assertThatThrownBy(() -> VisitWindow.of(TEN, TEN))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /**
     * BR-2 requires the visit to sit inside a single day's availability window, so a window
     * crossing midnight has to be recognisable as such.
     */
    @Test
    @DisplayName("a window crossing midnight is not a same-day window")
    void aWindowCrossingMidnightIsNotSameDay() {
        assertThat(VisitWindow.of(TEN.withHour(23), TEN.plusDays(1).withHour(1)).isSameDay()).isFalse();
    }
}
