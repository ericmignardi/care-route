package com.careroute.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * Emits the same {@code application/problem+json} shape as {@link GlobalExceptionHandler}
 * for failures raised inside the filter chain, before any controller is reached.
 */
@Component
@AllArgsConstructor
public class CustomAuthEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        ProblemDetailWriter.write(objectMapper, response, HttpStatus.UNAUTHORIZED, "Unauthorized",
                "Authentication is required to access this resource", "unauthorized", request.getRequestURI());
    }
}
