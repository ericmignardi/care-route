package com.careroute.backend;

import com.careroute.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The context loads, Flyway migrates, and Hibernate validates the mappings against the
 * schema those migrations produced — so a mapping that has drifted fails here.
 */
class CareRouteApplicationTests extends AbstractIntegrationTest {

    @Test
    @DisplayName("the context loads against a migrated schema")
    void contextLoads() {
        assertThat(roleRepository.findByName("ROLE_COORDINATOR")).isPresent();
    }
}
