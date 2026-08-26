package com.careroute.backend.web;

import com.careroute.backend.model.User;
import com.careroute.backend.support.AbstractIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A cookie holding a valid, unexpired token for a user who no longer exists — a deleted
 * account, a restored database, a reseeded environment all produce one.
 *
 * <p>{@code JwtAuthenticationFilter} caught the JWT parsing failures but not the lookup
 * failure, so {@code UsernameNotFoundException} escaped and aborted the request before any
 * handler ran. {@code POST /auth/login} then returned 401, so the holder of a stale cookie
 * could not sign back in without clearing site data by hand.
 */
class StaleSessionIT extends AbstractIntegrationTest {

    private Cookie staleCookie;

    @BeforeEach
    void mintATokenAndThenDeleteItsUser() {
        User ghost = persistUser("ghost", "ROLE_COORDINATOR");
        String token = tokenFor(ghost);
        userRepository.delete(ghost);

        staleCookie = new Cookie("jwt", token);
    }

    @Test
    @DisplayName("a token naming a deleted user does not abort the filter chain")
    void aStaleCookieStillReachesAPermittedEndpoint() throws Exception {
        // /actuator/health is permitted, so reaching it at all proves the chain continued
        // rather than being cut short by the unresolvable token.
        mockMvc.perform(get("/actuator/health").cookie(staleCookie))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a token naming a deleted user leaves the request anonymous, not broken")
    void aStaleCookieOnAProtectedEndpointIs401NotAServerError() throws Exception {
        mockMvc.perform(get("/api/v1/visits").cookie(staleCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }
}
