package com.careroute.backend.controller;

import com.careroute.backend.config.JwtProperties;
import com.careroute.backend.dto.AuthResponse;
import com.careroute.backend.dto.CurrentUserResponse;
import com.careroute.backend.dto.LoginRequest;
import com.careroute.backend.dto.RegisterRequest;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.repository.CaregiverRepository;
import com.careroute.backend.security.CustomUserDetails;
import com.careroute.backend.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtProperties jwtProperties;
    private final CaregiverRepository caregiverRepository;

    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok("User registered successfully!");
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthResponse authResponse = authService.login(request);

        ResponseCookie cookie = ResponseCookie.from("jwt", authResponse.token())
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .path("/")
                .maxAge(jwtProperties.getExpirationTime() / 1000)
                .sameSite(jwtProperties.getCookieSameSite())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("jwt", null)
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .path("/")
                .maxAge(0)
                .sameSite(jwtProperties.getCookieSameSite())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ResponseEntity.ok("Logged out successfully!");
    }

    /** FR-1.3. The frontend hydrates from here on load, so a refresh restores from the cookie. */
    @GetMapping("/me")
    public CurrentUserResponse me(@AuthenticationPrincipal CustomUserDetails principal) {
        UUID caregiverId = caregiverRepository.findByUserId(principal.getUserId())
                .map(Caregiver::getId)
                .orElse(null);
        return CurrentUserResponse.from(principal, caregiverId);
    }
}
