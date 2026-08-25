package com.careroute.backend.exception;

import com.careroute.backend.model.Visit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.context.request.ServletWebRequest;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The wire contract for domain failures: the status, and the machine-readable {@code rule} a
 * frontend branches on. Covered here rather than over HTTP because these mappings are what
 * the rest of the suite's exception-type assertions rely on to mean anything.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("BR-8: an optimistic locking failure is reported as 409")
    void br8_anOptimisticLockingFailureIsReportedAs409() {
        ProblemDetail problem = handler.handleOptimisticLocking(
                new OptimisticLockingFailureException("row was updated"), request("/api/v1/visits/1"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(problem.getProperties()).containsEntry("rule", "CONCURRENT_MODIFICATION");
        assertThat(problem.getDetail()).contains("modified by someone else");
    }

    @Test
    @DisplayName("BR-8: the Hibernate-flavoured subclass lands on the same handler")
    void br8_theHibernateSubclassIsHandledToo() {
        ProblemDetail problem = handler.handleOptimisticLocking(
                new ObjectOptimisticLockingFailureException(Visit.class, UUID.randomUUID()),
                request("/api/v1/visits/1"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
    }

    @Test
    @DisplayName("BR-1: a scheduling conflict is 409 and names the rule that rejected it")
    void br1_aSchedulingConflictIs409WithItsRule() {
        ProblemDetail problem = handler.handleSchedulingConflict(
                new SchedulingConflictException("CAREGIVER_DOUBLE_BOOKED", "Booked 10:00-11:30"),
                request("/api/v1/visits"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(problem.getProperties()).containsEntry("rule", "CAREGIVER_DOUBLE_BOOKED");
        assertThat(problem.getDetail()).isEqualTo("Booked 10:00-11:30");
    }

    @Test
    @DisplayName("BR-2/BR-3: a business rule violation is 422 and names the rule")
    void br2_aBusinessRuleViolationIs422WithItsRule() {
        ProblemDetail problem = handler.handleBusinessRuleViolation(
                new BusinessRuleViolationException("CAREGIVER_MISSING_SKILL", "Missing: NURSING"),
                request("/api/v1/visits/1/assign"));

        assertThat(problem.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY.value());
        assertThat(problem.getProperties()).containsEntry("rule", "CAREGIVER_MISSING_SKILL");
    }

    private static ServletWebRequest request(String uri) {
        return new ServletWebRequest(new MockHttpServletRequest("POST", uri));
    }
}
