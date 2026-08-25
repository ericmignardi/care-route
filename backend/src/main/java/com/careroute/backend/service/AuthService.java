package com.careroute.backend.service;

import com.careroute.backend.controller.AuthController.AuthResponse;
import com.careroute.backend.controller.AuthController.LoginRequest;
import com.careroute.backend.controller.AuthController.RegisterRequest;
import com.careroute.backend.exception.BusinessRuleViolationException;
import com.careroute.backend.model.Role;
import com.careroute.backend.model.User;
import com.careroute.backend.repository.RoleRepository;
import com.careroute.backend.repository.UserRepository;
import com.careroute.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    /**
     * The only role a caller may grant themselves. Coordinator and admin accounts are created
     * by an existing admin, never by the applicant.
     */
    private static final String SELF_ASSIGNABLE_ROLE = "ROLE_CAREGIVER";

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    /**
     * Public self-registration. Roles are not taken from the request beyond confirming that
     * nothing privileged was asked for: {@code /auth/register} is unauthenticated, so honouring
     * a requested role would let anyone mint themselves an admin and walk straight past every
     * role check in the application.
     */
    public void register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username is already taken!");
        }
        if (request.getRoles() != null
                && request.getRoles().stream().anyMatch(role -> !SELF_ASSIGNABLE_ROLE.equals(role))) {
            throw new BusinessRuleViolationException("ROLE_NOT_SELF_ASSIGNABLE",
                    "Only a caregiver account can be self-registered");
        }

        Role role = roleRepository.findByName(SELF_ASSIGNABLE_ROLE)
                .orElseThrow(() -> new IllegalStateException(
                        SELF_ASSIGNABLE_ROLE + " is missing; V3__seed_roles.sql did not run"));

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRoles(Set.of(role));
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        userRepository.save(user);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
        String token = jwtService.generateToken(userDetails);

        return new AuthResponse(token);
    }
}
