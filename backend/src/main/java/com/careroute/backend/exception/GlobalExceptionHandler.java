package com.careroute.backend.exception;

import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Translates exceptions into RFC 7807 {@code application/problem+json} responses.
 *
 * <p>Every problem carries a {@code timestamp} and a {@code path}. Domain failures
 * additionally carry a {@code rule} property naming the business rule that rejected
 * the request, so a client can distinguish "double booked" from "missing skill"
 * without parsing prose.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String PROBLEM_BASE = "https://careroute.dev/problems/";

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleResourceNotFound(ResourceNotFoundException ex, WebRequest request) {
        return problem(HttpStatus.NOT_FOUND, "Resource Not Found", ex.getMessage(), "not-found", request);
    }

    @ExceptionHandler(BusinessRuleViolationException.class)
    public ProblemDetail handleBusinessRuleViolation(BusinessRuleViolationException ex, WebRequest request) {
        ProblemDetail problem = problem(HttpStatus.UNPROCESSABLE_ENTITY, "Business Rule Violation",
                ex.getMessage(), "business-rule-violation", request);
        problem.setProperty("rule", ex.getRule());
        return problem;
    }

    @ExceptionHandler(SchedulingConflictException.class)
    public ProblemDetail handleSchedulingConflict(SchedulingConflictException ex, WebRequest request) {
        ProblemDetail problem = problem(HttpStatus.CONFLICT, "Scheduling Conflict",
                ex.getMessage(), "scheduling-conflict", request);
        problem.setProperty("rule", ex.getRule());
        return problem;
    }

    /** BR-8. The Hibernate-flavoured subclass lands here too. */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ProblemDetail handleOptimisticLocking(OptimisticLockingFailureException ex, WebRequest request) {
        ProblemDetail problem = problem(HttpStatus.CONFLICT, "Concurrent Modification",
                "This record was modified by someone else. Reload it and try again.",
                "concurrent-modification", request);
        problem.setProperty("rule", "CONCURRENT_MODIFICATION");
        return problem;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex, WebRequest request) {
        return problem(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage(), "bad-request", request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex, WebRequest request) {
        return problem(HttpStatus.BAD_REQUEST, "Bad Request",
                "Parameter '" + ex.getName() + "' has an invalid value", "bad-request", request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ProblemDetail handleBadCredentials(BadCredentialsException ex, WebRequest request) {
        return problem(HttpStatus.UNAUTHORIZED, "Unauthorized",
                "Invalid username or password", "unauthorized", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex, WebRequest request) {
        return problem(HttpStatus.FORBIDDEN, "Forbidden", ex.getMessage(), "forbidden", request);
    }

    /**
     * Request body validation. The field-error map is preserved from the pre-ProblemDetail
     * handler and surfaced as the {@code errors} extension property.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationExceptions(MethodArgumentNotValidException ex, WebRequest request) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = error instanceof FieldError fieldError ? fieldError.getField() : error.getObjectName();
            errors.put(fieldName, error.getDefaultMessage());
        });

        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "Validation Failed",
                "Input validation errors occurred", "validation-failed", request);
        problem.setProperty("errors", errors);
        return problem;
    }

    /**
     * Validation on request parameters and path variables rather than the body.
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ProblemDetail handleHandlerMethodValidation(HandlerMethodValidationException ex, WebRequest request) {
        return problem(HttpStatus.BAD_REQUEST, "Validation Failed",
                "Input validation errors occurred", "validation-failed", request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleUnreadableBody(HttpMessageNotReadableException ex, WebRequest request) {
        return problem(HttpStatus.BAD_REQUEST, "Bad Request",
                "The request body could not be read", "bad-request", request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ProblemDetail handleMissingParameter(MissingServletRequestParameterException ex, WebRequest request) {
        return problem(HttpStatus.BAD_REQUEST, "Bad Request",
                "Required parameter '" + ex.getParameterName() + "' is missing", "bad-request", request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ProblemDetail handleMethodNotSupported(HttpRequestMethodNotSupportedException ex, WebRequest request) {
        return problem(HttpStatus.METHOD_NOT_ALLOWED, "Method Not Allowed", ex.getMessage(),
                "method-not-allowed", request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ProblemDetail handleNoResourceFound(NoResourceFoundException ex, WebRequest request) {
        return problem(HttpStatus.NOT_FOUND, "Resource Not Found", "No endpoint matches this request",
                "not-found", request);
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGlobalException(Exception ex, WebRequest request) {
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", ex.getMessage(),
                "internal-error", request);
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail, String type, WebRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setType(URI.create(PROBLEM_BASE + type));
        problem.setInstance(URI.create(request.getDescription(false).replace("uri=", "")));
        problem.setProperty("timestamp", Instant.now().toString());
        problem.setProperty("path", request.getDescription(false).replace("uri=", ""));
        return problem;
    }
}
