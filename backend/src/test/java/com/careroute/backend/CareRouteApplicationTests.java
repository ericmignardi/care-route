package com.careroute.backend;

import com.careroute.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The context loads, the Flyway migrations apply, and Hibernate validates the entity mappings
 * against the schema those migrations produced. That last part is the one worth having: a
 * mapping that has drifted from a migration fails here rather than on deployment day.
 */
class CareRouteApplicationTests extends AbstractIntegrationTest {

    @Test
    @DisplayName("the context loads against a migrated schema")
    void contextLoads() {
        assertThat(roleRepository.findByName("ROLE_COORDINATOR")).isPresent();
    }
}
