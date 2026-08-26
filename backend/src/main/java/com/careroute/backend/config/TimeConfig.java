package com.careroute.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * The clock the domain reads "now" from. Injected rather than called inline so the BR-4
 * tolerance test can pin time instead of scheduling relative to the wall clock.
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
