package com.careroute.backend.service;

import com.careroute.backend.dto.VisitDetailResponse;
import com.careroute.backend.exception.SchedulingConflictException;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.Client;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.security.CustomUserDetails;
import com.careroute.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * BR-4 and BR-5 — the field loop.
 *
 * <p>Time is pinned through the injected {@link com.careroute.backend.support.MutableClock},
 * so "31 minutes early" is a fact the test states rather than a race it hopes to win.
 */
class VisitExecutionServiceIT extends AbstractIntegrationTest {

    private static final LocalDateTime SCHEDULED_START = at(10, 0);

    @Autowired
    private VisitExecutionService executionService;

    private Caregiver caregiver;
    private CustomUserDetails principal;
    private Client client;

    @BeforeEach
    void createFieldFixture() {
        client = persistClient("Okonkwo");
        caregiver = persistCaregiver("nadia", Skill.NURSING);
        principal = principalFor(caregiver);
    }

    // --- BR-4: check-in -----------------------------------------------------

    @Test
    @DisplayName("BR-4: checking in at the scheduled time starts the visit")
    void br4_checkingInOnTimeStartsTheVisit() {
        Visit visit = scheduledVisit();
        clock.setNow(SCHEDULED_START);

        VisitDetailResponse checkedIn = executionService.checkIn(visit.getId(), principal);

        assertThat(checkedIn.status()).isEqualTo(VisitStatus.IN_PROGRESS);
        assertThat(checkedIn.checkedInAt()).isEqualTo(clock.instant());
    }

    @Test
    @DisplayName("BR-4: checking in at the far edge of the tolerance is still accepted")
    void br4_checkingInAtTheEdgeOfToleranceIsAccepted() {
        Visit visit = scheduledVisit();
        clock.setNow(SCHEDULED_START.minusMinutes(30));

        assertThat(executionService.checkIn(visit.getId(), principal).status())
                .isEqualTo(VisitStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("BR-4: checking in a minute beyond the tolerance is rejected")
    void br4_checkingInTooEarlyIsRejected() {
        Visit visit = scheduledVisit();
        clock.setNow(SCHEDULED_START.minusMinutes(31));

        assertThatThrownBy(() -> executionService.checkIn(visit.getId(), principal))
                .isInstanceOf(SchedulingConflictException.class)
                .hasMessage("Check-in opens within 30 minutes of 10:00")
                .extracting("rule").isEqualTo("CHECK_IN_OUTSIDE_TOLERANCE");

        assertThat(reload(visit).getStatus()).isEqualTo(VisitStatus.SCHEDULED);
    }

    @Test
    @DisplayName("BR-4: arriving hours late is rejected too, not just arriving early")
    void br4_checkingInTooLateIsRejected() {
        Visit visit = scheduledVisit();
        clock.setNow(SCHEDULED_START.plusHours(3));

        assertThatThrownBy(() -> executionService.checkIn(visit.getId(), principal))
                .isInstanceOf(SchedulingConflictException.class)
                .extracting("rule").isEqualTo("CHECK_IN_OUTSIDE_TOLERANCE");
    }

    @Test
    @DisplayName("BR-4: only a SCHEDULED visit can be checked into")
    void br4_checkingIntoAVisitAlreadyUnderWayIsRejected() {
        Visit visit = persistVisit(client, caregiver, SCHEDULED_START, at(11, 0), Skill.NURSING,
                VisitStatus.IN_PROGRESS);
        clock.setNow(SCHEDULED_START);

        assertThatThrownBy(() -> executionService.checkIn(visit.getId(), principal))
                .isInstanceOf(SchedulingConflictException.class)
                .extracting("rule").isEqualTo("ILLEGAL_STATUS_TRANSITION");
    }

    @Test
    @DisplayName("BR-4: a cancelled visit cannot be checked into")
    void br4_checkingIntoACancelledVisitIsRejected() {
        Visit visit = persistVisit(client, caregiver, SCHEDULED_START, at(11, 0), Skill.NURSING,
                VisitStatus.CANCELLED);
        clock.setNow(SCHEDULED_START);

        assertThatThrownBy(() -> executionService.checkIn(visit.getId(), principal))
                .isInstanceOf(SchedulingConflictException.class)
                .extracting("rule").isEqualTo("ILLEGAL_STATUS_TRANSITION");
    }

    // --- BR-5: check-out ----------------------------------------------------

    @Test
    @DisplayName("BR-5: checking out of a visit in progress completes it")
    void br5_checkingOutCompletesTheVisit() {
        Visit visit = persistVisit(client, caregiver, SCHEDULED_START, at(11, 0), Skill.NURSING,
                VisitStatus.IN_PROGRESS);
        clock.setNow(at(11, 5));

        VisitDetailResponse checkedOut = executionService.checkOut(visit.getId(), principal);

        assertThat(checkedOut.status()).isEqualTo(VisitStatus.COMPLETED);
        assertThat(checkedOut.checkedOutAt()).isEqualTo(clock.instant());
    }

    @Test
    @DisplayName("BR-5: a scheduled visit cannot be checked out of")
    void br5_checkingOutOfAScheduledVisitIsRejected() {
        Visit visit = scheduledVisit();
        clock.setNow(at(11, 0));

        assertThatThrownBy(() -> executionService.checkOut(visit.getId(), principal))
                .isInstanceOf(SchedulingConflictException.class)
                .extracting("rule").isEqualTo("ILLEGAL_STATUS_TRANSITION");

        assertThat(reload(visit).getStatus()).isEqualTo(VisitStatus.SCHEDULED);
    }

    @Test
    @DisplayName("BR-5: checking out twice is rejected")
    void br5_checkingOutTwiceIsRejected() {
        Visit visit = persistVisit(client, caregiver, SCHEDULED_START, at(11, 0), Skill.NURSING,
                VisitStatus.IN_PROGRESS);
        clock.setNow(at(11, 5));
        executionService.checkOut(visit.getId(), principal);

        assertThatThrownBy(() -> executionService.checkOut(visit.getId(), principal))
                .isInstanceOf(SchedulingConflictException.class)
                .extracting("rule").isEqualTo("ILLEGAL_STATUS_TRANSITION");
    }

    // --- FR-5.3 -------------------------------------------------------------

    @Test
    @DisplayName("FR-5.3: a task cannot be ticked before the caregiver has checked in")
    void taskCompletionRequiresAVisitInProgress() {
        Visit visit = persistVisitWithTasks(client, caregiver, SCHEDULED_START, at(11, 0), Skill.NURSING,
                VisitStatus.SCHEDULED, "Assist with shower");
        clock.setNow(SCHEDULED_START);

        assertThatThrownBy(() ->
                executionService.completeTask(visit.getId(), visit.getTasks().getFirst().getId(), principal))
                .isInstanceOf(SchedulingConflictException.class)
                .extracting("rule").isEqualTo("VISIT_NOT_IN_PROGRESS");
    }

    /**
     * The whole caregiver workflow in one pass. Each step is covered individually above; this
     * asserts they compose, which is the thing a demo actually does.
     */
    @Test
    @DisplayName("the field loop: check in, complete the tasks, add a note, check out")
    void theFieldLoopRunsEndToEnd() {
        Visit visit = persistVisitWithTasks(client, caregiver, SCHEDULED_START, at(11, 0), Skill.NURSING,
                VisitStatus.SCHEDULED, "Assist with shower", "Prepare breakfast");
        clock.setNow(SCHEDULED_START.minusMinutes(5));

        executionService.checkIn(visit.getId(), principal);
        for (var task : reload(visit).getTasks()) {
            executionService.completeTask(visit.getId(), task.getId(), principal);
        }
        executionService.addNote(visit.getId(), "Client in good spirits.", principal);
        clock.setNow(at(11, 2));
        VisitDetailResponse completed = executionService.checkOut(visit.getId(), principal);

        assertThat(completed.status()).isEqualTo(VisitStatus.COMPLETED);
        assertThat(completed.notes()).isEqualTo("Client in good spirits.");
        assertThat(completed.tasks()).allMatch(task -> task.completed());
        assertThat(completed.checkedInAt()).isBefore(completed.checkedOutAt());
    }

    private Visit scheduledVisit() {
        return persistVisit(client, caregiver, SCHEDULED_START, at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);
    }

    private Visit reload(Visit visit) {
        return visitRepository.findByIdWithTasks(visit.getId()).orElseThrow();
    }
}
