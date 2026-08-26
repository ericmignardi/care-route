package com.careroute.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Agency policy rather than code. The zone is load-bearing: visits are stored as local
 * wall-clock times, so comparing "now" against a scheduled start is only meaningful in
 * the agency's own timezone.
 */
@Configuration
@ConfigurationProperties(prefix = "app.scheduling")
@Getter
@Setter
public class SchedulingProperties {

    /** BR-4 — how far either side of the scheduled start a check-in is accepted. */
    private int checkInToleranceMinutes = 30;

    private String zoneId = "America/Toronto";
}
