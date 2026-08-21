package com.careroute.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "security.jwt")
@Getter
@Setter
public class JwtProperties {

    private String secretKey = "mySecretKeyMustBeAtLeast32BytesLongToSatisfyHmacSha256Requirements";
    private long expirationTime = 86400000;
    private boolean cookieSecure = false;
    private String cookieSameSite = "Lax";
}
