package com.careroute.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Operational policy that belongs to the agency rather than to the code.
 *
 * <p>The check-in tolerance (BR-4) is configurable because thirty minutes is a policy
 * choice, not a law, and because a demo run wants it loose while production wants it tight.
 * The zone matters because visits are stored as local wall-clock times: comparing "now"
 * against a scheduled start is only meaningful in the agency's own timezone.
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
