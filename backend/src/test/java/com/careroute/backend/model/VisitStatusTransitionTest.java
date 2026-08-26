package com.careroute.backend.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The visit lifecycle, PRD section 5.3. The matrix below states the legal transitions as
 * data rather than re-deriving them from the implementation, so a new case in
 * {@link Visit#canTransitionTo} fails here until this diagram is updated deliberately.
 */
class VisitStatusTransitionTest {

    /** The complete set of legal transitions, transcribed from the PRD state diagram. */
    private static final Map<VisitStatus, Set<VisitStatus>> LEGAL = Map.of(
            VisitStatus.SCHEDULED, Set.of(VisitStatus.IN_PROGRESS, VisitStatus.CANCELLED, VisitStatus.MISSED),
            VisitStatus.IN_PROGRESS, Set.of(VisitStatus.COMPLETED),
            VisitStatus.COMPLETED, Set.of(),
            VisitStatus.CANCELLED, Set.of(),
            VisitStatus.MISSED, Set.of());

    @ParameterizedTest(name = "{0} -> {1}")
    @MethodSource("everyPairOfStatuses")
    @DisplayName("every status pair matches the PRD state diagram")
    void everyTransitionMatchesTheStateDiagram(VisitStatus from, VisitStatus to) {
        Visit visit = visitIn(from);

        assertThat(visit.canTransitionTo(to))
                .as("%s -> %s", from, to)
                .isEqualTo(LEGAL.get(from).contains(to));
    }

    @Test
    @DisplayName("BR-6: a completed visit cannot be cancelled")
    void br6_aCompletedVisitCannotBeCancelled() {
        assertThat(visitIn(VisitStatus.COMPLETED).canTransitionTo(VisitStatus.CANCELLED)).isFalse();
    }

    @Test
    @DisplayName("BR-6: a scheduled visit can be cancelled")
    void br6_aScheduledVisitCanBeCancelled() {
        assertThat(visitIn(VisitStatus.SCHEDULED).canTransitionTo(VisitStatus.CANCELLED)).isTrue();
    }

    /**
     * BR-6 as the PRD state diagram reads it: a visit already under way is ended by checking
     * out, not by cancelling it out from under the caregiver.
     */
    @Test
    @DisplayName("BR-6: a visit in progress cannot be cancelled either")
    void br6_anInProgressVisitCannotBeCancelled() {
        assertThat(visitIn(VisitStatus.IN_PROGRESS).canTransitionTo(VisitStatus.CANCELLED)).isFalse();
    }

    @Test
    @DisplayName("BR-5: check-out is the only route out of IN_PROGRESS")
    void br5_inProgressLeadsOnlyToCompleted() {
        Visit visit = visitIn(VisitStatus.IN_PROGRESS);

        assertThat(visit.canTransitionTo(VisitStatus.COMPLETED)).isTrue();
        assertThat(visit.canTransitionTo(VisitStatus.MISSED)).isFalse();
        assertThat(visit.canTransitionTo(VisitStatus.SCHEDULED)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(VisitStatus.class)
    @DisplayName("no status transitions to itself")
    void noStatusTransitionsToItself(VisitStatus status) {
        assertThat(visitIn(status).canTransitionTo(status)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = VisitStatus.class, names = {"COMPLETED", "CANCELLED", "MISSED"})
    @DisplayName("terminal statuses are terminal")
    void terminalStatusesAcceptNothing(VisitStatus terminal) {
        Visit visit = visitIn(terminal);

        assertThat(Arrays.stream(VisitStatus.values()).filter(visit::canTransitionTo)).isEmpty();
    }

    private static Stream<Arguments> everyPairOfStatuses() {
        return Arrays.stream(VisitStatus.values())
                .flatMap(from -> Arrays.stream(VisitStatus.values()).map(to -> Arguments.of(from, to)));
    }

    private static Visit visitIn(VisitStatus status) {
        Visit visit = new Visit();
        visit.setStatus(status);
        return visit;
    }
}
