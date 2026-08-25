package com.careroute.backend.support;

import com.careroute.backend.config.SchedulingProperties;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

/**
 * Replaces the application's system {@link Clock} with one the tests control. Declared
 * {@code @Primary} rather than same-named so the production bean definition stays intact
 * and nothing depends on bean-definition overriding being switched on.
 */
@TestConfiguration
public class TestClockConfig {

    @Bean
    @Primary
    public MutableClock mutableClock(SchedulingProperties schedulingProperties) {
        return new MutableClock(ZoneId.of(schedulingProperties.getZoneId()), Instant.now());
    }
}
