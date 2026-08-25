package com.careroute.backend.exception;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;

/**
 * Serialises a {@link ProblemDetail} straight onto the servlet response. Needed because
 * Spring Security's filter-chain handlers run outside the {@code @RestControllerAdvice},
 * and error shapes that differ between the filter chain and the controllers are exactly
 * the kind of inconsistency a client has to write two code paths for.
 */
final class ProblemDetailWriter {

    private static final String PROBLEM_BASE = "https://careroute.dev/problems/";

    private ProblemDetailWriter() {
    }

    static void write(ObjectMapper objectMapper, HttpServletResponse response, HttpStatus status,
                      String title, String detail, String type, String path) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setType(URI.create(PROBLEM_BASE + type));
        problem.setInstance(URI.create(path));
        problem.setProperty("timestamp", Instant.now().toString());
        problem.setProperty("path", path);

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), problem);
    }
}
