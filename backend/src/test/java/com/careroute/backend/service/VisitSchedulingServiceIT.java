package com.careroute.backend.service;

import com.careroute.backend.dto.CaregiverEligibilityResponse;
import com.careroute.backend.dto.EligibilityRule;
import com.careroute.backend.dto.ScheduleVisitRequest;
import com.careroute.backend.dto.VisitDetailResponse;
import com.careroute.backend.exception.BusinessRuleViolationException;
import com.careroute.backend.exception.SchedulingConflictException;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.Client;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The scheduling rules as the API enforces them, including which failures are conflicts
 * (409) and which are unprocessable (422).
 *
 * <p>Deliberately not transactional: these tests commit, so a rule that only holds because
 * a change was never flushed fails here.
 */
class VisitSchedulingServiceIT extends AbstractIntegrationTest {

    @Autowired
    private VisitSchedulingService schedulingService;

    private Client client;

    @BeforeEach
    void createClient() {
        client = persistClient("Okonkwo", "Assist with shower", "Prepare breakfast");
    }

    // --- happy paths --------------------------------------------------------

    @Test
    @DisplayName("FR-4.6: scheduling copies the client's care plan onto the visit")
    void schedulingCopiesTheCarePlanOntoTheVisit() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);

        VisitDetailResponse visit = schedulingService.schedule(
                request(client, caregiver, Skill.NURSING, 10, 11));

        assertThat(visit.status()).isEqualTo(VisitStatus.SCHEDULED);
        assertThat(visit.tasks()).extracting("description")
                .containsExactly("Assist with shower", "Prepare breakfast");
    }

    @Test
    @DisplayName("a visit can be scheduled before anyone is assigned to it")
    void aVisitCanBeScheduledWithoutACaregiver() {
        VisitDetailResponse visit = schedulingService.schedule(new ScheduleVisitRequest(
                client.getId(), null, at(10, 0), at(11, 0), Skill.NURSING));

        assertThat(visit.caregiver()).isNull();
        assertThat(visit.status()).isEqualTo(VisitStatus.SCHEDULED);
    }

    @Test
    @DisplayName("FR-4.2: an eligible caregiver can be assigned to an unassigned visit")
    void anEligibleCaregiverCanBeAssigned() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        Visit visit = persistVisit(client, null, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        VisitDetailResponse assigned = schedulingService.assign(visit.getId(), caregiver.getId());

        assertThat(assigned.caregiver()).isNotNull();
        assertThat(assigned.caregiver().id()).isEqualTo(caregiver.getId());
    }

    // --- BR-1 ---------------------------------------------------------------

    @Test
    @DisplayName("BR-1: scheduling an overlapping visit for the same caregiver is a conflict")
    void br1_schedulingAnOverlappingVisitIsAConflict() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        persistVisit(client, caregiver, at(10, 0), at(11, 30), Skill.NURSING, VisitStatus.SCHEDULED);

        assertThatThrownBy(() -> schedulingService.schedule(request(client, caregiver, Skill.NURSING, 11, 12)))
                .isInstanceOf(SchedulingConflictException.class)
                .hasMessage("Booked 10:00-11:30")
                .extracting("rule").isEqualTo(EligibilityRule.CAREGIVER_DOUBLE_BOOKED.name());

        assertThat(visitRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("BR-1 boundary: a visit abutting an existing one is accepted")
    void br1_aVisitAbuttingAnExistingOneIsAccepted() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        persistVisit(client, caregiver, at(10, 0), at(11, 30), Skill.NURSING, VisitStatus.SCHEDULED);

        VisitDetailResponse visit = schedulingService.schedule(new ScheduleVisitRequest(
                client.getId(), caregiver.getId(), at(11, 30), at(12, 30), Skill.NURSING));

        assertThat(visit.status()).isEqualTo(VisitStatus.SCHEDULED);
        assertThat(visitRepository.count()).isEqualTo(2);
    }

    @Test
    @DisplayName("BR-1: reassigning a visit to the caregiver who already holds it is not a conflict")
    void br1_reassigningAVisitToItsOwnCaregiverIsNotAConflict() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        Visit visit = persistVisit(client, caregiver, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        VisitDetailResponse reassigned = schedulingService.assign(visit.getId(), caregiver.getId());

        assertThat(reassigned.caregiver().id()).isEqualTo(caregiver.getId());
    }

    // --- BR-2 ---------------------------------------------------------------

    @Test
    @DisplayName("BR-2: scheduling outside the caregiver's availability is unprocessable")
    void br2_schedulingOutsideAvailabilityIsUnprocessable() {
        Caregiver caregiver = persistCaregiver("ines", LocalTime.of(8, 0), LocalTime.of(16, 0), Skill.NURSING);

        assertThatThrownBy(() -> schedulingService.schedule(request(client, caregiver, Skill.NURSING, 17, 18)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessage("Only available Tuesdays 08:00-16:00")
                .extracting("rule").isEqualTo(EligibilityRule.CAREGIVER_UNAVAILABLE.name());

        assertThat(visitRepository.count()).isZero();
    }

    @Test
    @DisplayName("BR-2: assigning a caregiver who does not work that day is unprocessable")
    void br2_assigningACaregiverWhoDoesNotWorkThatDayIsUnprocessable() {
        Caregiver caregiver = persistCaregiverWithoutAvailability("dmitri", Skill.NURSING);
        Visit visit = persistVisit(client, null, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        assertThatThrownBy(() -> schedulingService.assign(visit.getId(), caregiver.getId()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessage("Not available Tuesdays");
    }

    // --- BR-3 ---------------------------------------------------------------

    @Test
    @DisplayName("BR-3: assigning a caregiver without the required skill is unprocessable")
    void br3_assigningACaregiverWithoutTheRequiredSkillIsUnprocessable() {
        Caregiver caregiver = persistCaregiver("pavel", Skill.PERSONAL_SUPPORT);
        Visit visit = persistVisit(client, null, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        assertThatThrownBy(() -> schedulingService.assign(visit.getId(), caregiver.getId()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessage("Missing: NURSING")
                .extracting("rule").isEqualTo(EligibilityRule.CAREGIVER_MISSING_SKILL.name());

        assertThat(visitRepository.findById(visit.getId()).orElseThrow().getCaregiver()).isNull();
    }

    @Test
    @DisplayName("BR-3: a caregiver holding the required skill can be assigned")
    void br3_aCaregiverHoldingTheRequiredSkillCanBeAssigned() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING, Skill.MEDICATION);
        Visit visit = persistVisit(client, null, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        assertThat(schedulingService.assign(visit.getId(), caregiver.getId()).caregiver().id())
                .isEqualTo(caregiver.getId());
    }

    // --- BR-6 ---------------------------------------------------------------

    @Test
    @DisplayName("BR-6: a completed visit cannot be cancelled")
    void br6_aCompletedVisitCannotBeCancelled() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        Visit visit = persistVisit(client, caregiver, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.COMPLETED);

        assertThatThrownBy(() -> schedulingService.cancel(visit.getId()))
                .isInstanceOf(SchedulingConflictException.class)
                .extracting("rule").isEqualTo("ILLEGAL_STATUS_TRANSITION");

        assertThat(visitRepository.findById(visit.getId()).orElseThrow().getStatus())
                .isEqualTo(VisitStatus.COMPLETED);
    }

    @Test
    @DisplayName("BR-6: a scheduled visit can be cancelled")
    void br6_aScheduledVisitCanBeCancelled() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        Visit visit = persistVisit(client, caregiver, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        assertThat(schedulingService.cancel(visit.getId()).status()).isEqualTo(VisitStatus.CANCELLED);
    }

    // --- FR-3.4 -------------------------------------------------------------

    /**
     * Ineligible caregivers come back with the reason attached, so the assign dialog can dim
     * a name and say why rather than silently omitting it.
     */
    @Test
    @DisplayName("FR-3.4: eligible caregivers are listed alongside the ineligible ones and their reasons")
    void eligibleCaregiversCarryTheReasonsTheOthersCannotTakeTheSlot() {
        Caregiver free = persistCaregiver("nadia", Skill.NURSING);
        Caregiver unskilled = persistCaregiver("pavel", Skill.PERSONAL_SUPPORT);
        Caregiver booked = persistCaregiver("sam", Skill.NURSING);
        persistVisit(client, booked, at(10, 0), at(11, 30), Skill.NURSING, VisitStatus.SCHEDULED);
        persistInactiveCaregiver("retired", Skill.NURSING);

        List<CaregiverEligibilityResponse> results =
                schedulingService.findEligibleCaregivers(at(11, 0), at(12, 0), Skill.NURSING, null);

        assertThat(results).extracting(CaregiverEligibilityResponse::caregiverId)
                .containsExactlyInAnyOrder(free.getId(), unskilled.getId(), booked.getId());
        assertThat(results).filteredOn(CaregiverEligibilityResponse::eligible)
                .extracting(CaregiverEligibilityResponse::caregiverId)
                .containsExactly(free.getId());
        assertThat(reasonFor(results, unskilled)).isEqualTo("Missing: NURSING");
        assertThat(reasonFor(results, booked)).isEqualTo("Booked 10:00-11:30");
    }

    private static String reasonFor(List<CaregiverEligibilityResponse> results, Caregiver caregiver) {
        return results.stream()
                .filter(r -> r.caregiverId().equals(caregiver.getId()))
                .findFirst()
                .orElseThrow()
                .reasons()
                .getFirst()
                .message();
    }

    private ScheduleVisitRequest request(Client client, Caregiver caregiver, Skill skill, int fromHour, int toHour) {
        return new ScheduleVisitRequest(client.getId(), caregiver.getId(),
                at(fromHour, 0), at(toHour, 0), skill);
    }
}
