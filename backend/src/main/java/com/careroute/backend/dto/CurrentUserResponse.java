package com.careroute.backend.dto;

import com.careroute.backend.security.CustomUserDetails;
import org.springframework.security.core.GrantedAuthority;

import java.util.List;
import java.util.UUID;

/** FR-1.3. {@code caregiverId} is non-null only for accounts with a caregiver profile. */
public record CurrentUserResponse(
        UUID userId,
        String username,
        String firstName,
        String lastName,
        List<String> roles,
        UUID caregiverId
) {

    public static CurrentUserResponse from(CustomUserDetails principal, UUID caregiverId) {
        return new CurrentUserResponse(
                principal.getUserId(),
                principal.getUsername(),
                principal.getFirstName(),
                principal.getLastName(),
                principal.getAuthorities().stream().map(GrantedAuthority::getAuthority).sorted().toList(),
                caregiverId
        );
    }
}
