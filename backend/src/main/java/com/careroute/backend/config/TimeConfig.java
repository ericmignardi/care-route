package com.careroute.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * Supplies the clock the domain reads "now" from. Injecting it rather than calling
 * {@code Instant.now()} inline is what lets the BR-4 tolerance test pin time instead of
 * scheduling a visit relative to the wall clock and hoping.
 */
@Configuration
@RequiredArgsConstructor
public class TimeConfig {

    private final SchedulingProperties schedulingProperties;

    @Bean
    public Clock clock() {
        return Clock.system(ZoneId.of(schedulingProperties.getZoneId()));
    }
}
