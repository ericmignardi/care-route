package com.careroute.backend.service;

import com.careroute.backend.dto.EligibilityReason;
import com.careroute.backend.dto.EligibilityResult;
import com.careroute.backend.dto.EligibilityRule;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.Client;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.model.VisitWindow;
import com.careroute.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * BR-1, BR-2 and BR-3 against a real database, through the one component that evaluates them.
 *
 * <p>Transactional because that is how the checker runs in production — always inside a
 * service transaction, on managed entities with lazily-loaded skills. Testing it detached
 * would test a situation that never occurs.
 */
@Transactional
class VisitEligibilityCheckerIT extends AbstractIntegrationTest {

    @Autowired
    private VisitEligibilityChecker checker;

    private Client client;

    @BeforeEach
    void createClient() {
        client = persistClient("Okonkwo");
    }

    // --- BR-3: the caregiver must hold the required skill -------------------

    @Test
    @DisplayName("BR-3: a caregiver holding the required skill is eligible")
    void br3_aCaregiverHoldingTheRequiredSkillIsEligible() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING, Skill.MEDICATION);

        EligibilityResult result = check(caregiver, at(10, 0), at(11, 0), Skill.NURSING);

        assertThat(result.eligible()).isTrue();
        assertThat(result.reasons()).isEmpty();
    }

    @Test
    @DisplayName("BR-3: a caregiver missing the required skill is rejected, and told which")
    void br3_aCaregiverMissingTheRequiredSkillIsRejected() {
        Caregiver caregiver = persistCaregiver("pavel", Skill.PERSONAL_SUPPORT);

        EligibilityResult result = check(caregiver, at(10, 0), at(11, 0), Skill.NURSING);

        assertThat(result.eligible()).isFalse();
        assertThat(rulesOf(result)).containsExactly(EligibilityRule.CAREGIVER_MISSING_SKILL);
        assertThat(result.primaryReason().message()).isEqualTo("Missing: NURSING");
    }

    // --- BR-2: the window must sit inside one availability block ------------

    @Test
    @DisplayName("BR-2: a window inside the availability block is eligible")
    void br2_aWindowInsideTheAvailabilityBlockIsEligible() {
        Caregiver caregiver = persistCaregiver("ines", LocalTime.of(8, 0), LocalTime.of(16, 0), Skill.NURSING);

        assertThat(check(caregiver, at(10, 0), at(11, 0), Skill.NURSING).eligible()).isTrue();
    }

    @Test
    @DisplayName("BR-2: a window flush against both ends of the availability block is eligible")
    void br2_aWindowFillingTheAvailabilityBlockExactlyIsEligible() {
        Caregiver caregiver = persistCaregiver("ines", LocalTime.of(8, 0), LocalTime.of(16, 0), Skill.NURSING);

        assertThat(check(caregiver, at(8, 0), at(16, 0), Skill.NURSING).eligible()).isTrue();
    }

    @Test
    @DisplayName("BR-2: a window starting before the caregiver's day opens is rejected")
    void br2_aWindowStartingBeforeAvailabilityOpensIsRejected() {
        Caregiver caregiver = persistCaregiver("ines", LocalTime.of(8, 0), LocalTime.of(16, 0), Skill.NURSING);

        EligibilityResult result = check(caregiver, at(7, 30), at(9, 0), Skill.NURSING);

        assertThat(rulesOf(result)).containsExactly(EligibilityRule.CAREGIVER_UNAVAILABLE);
        assertThat(result.primaryReason().message()).isEqualTo("Only available Tuesdays 08:00-16:00");
    }

    @Test
    @DisplayName("BR-2: a window running past the caregiver's day is rejected")
    void br2_aWindowEndingAfterAvailabilityClosesIsRejected() {
        Caregiver caregiver = persistCaregiver("ines", LocalTime.of(8, 0), LocalTime.of(16, 0), Skill.NURSING);

        assertThat(rulesOf(check(caregiver, at(15, 30), at(17, 0), Skill.NURSING)))
                .containsExactly(EligibilityRule.CAREGIVER_UNAVAILABLE);
    }

    @Test
    @DisplayName("BR-2: a caregiver who does not work that day is rejected")
    void br2_aCaregiverWhoDoesNotWorkThatDayIsRejected() {
        Caregiver caregiver = persistCaregiverWithoutAvailability("dmitri", Skill.NURSING);

        EligibilityResult result = check(caregiver, at(10, 0), at(11, 0), Skill.NURSING);

        assertThat(rulesOf(result)).containsExactly(EligibilityRule.CAREGIVER_UNAVAILABLE);
        assertThat(result.primaryReason().message()).isEqualTo("Not available Tuesdays");
    }

    /**
     * BR-2 says entirely within <em>one</em> availability window. A caregiver working
     * 08:00-12:00 and 13:00-17:00 cannot take 11:00-14:00, even though every minute is
     * nominally covered — the gap is a lunch break, not a technicality.
     */
    @Test
    @DisplayName("BR-2: a window bridging two separate availability blocks is rejected")
    void br2_aWindowBridgingTwoAvailabilityBlocksIsRejected() {
        Caregiver caregiver = persistCaregiver("ines", LocalTime.of(8, 0), LocalTime.of(12, 0), Skill.NURSING);
        addAvailability(caregiver, DAY.getDayOfWeek(), LocalTime.of(13, 0), LocalTime.of(17, 0));

        EligibilityResult result = check(caregiver, at(11, 0), at(14, 0), Skill.NURSING);

        assertThat(rulesOf(result)).containsExactly(EligibilityRule.CAREGIVER_UNAVAILABLE);
        assertThat(result.primaryReason().message())
                .isEqualTo("Only available Tuesdays 08:00-12:00, 13:00-17:00");
    }

    // --- BR-1: no overlapping non-cancelled visit ---------------------------

    @Test
    @DisplayName("BR-1: an overlapping visit makes the caregiver ineligible, and says when")
    void br1_anOverlappingVisitMakesTheCaregiverIneligible() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        persistVisit(client, caregiver, at(10, 0), at(11, 30), Skill.NURSING, VisitStatus.SCHEDULED);

        EligibilityResult result = check(caregiver, at(11, 0), at(12, 0), Skill.NURSING);

        assertThat(rulesOf(result)).containsExactly(EligibilityRule.CAREGIVER_DOUBLE_BOOKED);
        assertThat(result.primaryReason().message()).isEqualTo("Booked 10:00-11:30");
    }

    @Test
    @DisplayName("BR-1: a visit elsewhere in the day does not conflict")
    void br1_aVisitElsewhereInTheDayDoesNotConflict() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        persistVisit(client, caregiver, at(8, 0), at(9, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        assertThat(check(caregiver, at(11, 0), at(12, 0), Skill.NURSING).eligible()).isTrue();
    }

    /**
     * The half-open interval, and the one BR-1 case an off-by-one silently gets wrong: a
     * caregiver finishing at 11:30 is free at 11:30.
     */
    @Test
    @DisplayName("BR-1 boundary: a visit starting exactly when another ends does not conflict")
    void br1_aVisitStartingExactlyWhenAnotherEndsDoesNotConflict() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        persistVisit(client, caregiver, at(10, 0), at(11, 30), Skill.NURSING, VisitStatus.SCHEDULED);

        assertThat(check(caregiver, at(11, 30), at(12, 30), Skill.NURSING).eligible()).isTrue();
    }

    @Test
    @DisplayName("BR-1 boundary: a visit ending exactly when another begins does not conflict")
    void br1_aVisitEndingExactlyWhenAnotherBeginsDoesNotConflict() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        persistVisit(client, caregiver, at(11, 30), at(12, 30), Skill.NURSING, VisitStatus.SCHEDULED);

        assertThat(check(caregiver, at(10, 0), at(11, 30), Skill.NURSING).eligible()).isTrue();
    }

    @Test
    @DisplayName("BR-1 boundary: one minute of overlap is still an overlap")
    void br1_oneMinuteOfOverlapStillConflicts() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        persistVisit(client, caregiver, at(10, 0), at(11, 30), Skill.NURSING, VisitStatus.SCHEDULED);

        assertThat(rulesOf(check(caregiver, at(11, 29), at(12, 30), Skill.NURSING)))
                .containsExactly(EligibilityRule.CAREGIVER_DOUBLE_BOOKED);
    }

    @Test
    @DisplayName("BR-1: a cancelled visit frees the slot")
    void br1_aCancelledVisitDoesNotConflict() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        persistVisit(client, caregiver, at(10, 0), at(11, 30), Skill.NURSING, VisitStatus.CANCELLED);

        assertThat(check(caregiver, at(10, 0), at(11, 30), Skill.NURSING).eligible()).isTrue();
    }

    @Test
    @DisplayName("BR-1: the visit being reassigned does not conflict with itself")
    void br1_theVisitBeingReassignedDoesNotConflictWithItself() {
        Caregiver caregiver = persistCaregiver("nadia", Skill.NURSING);
        Visit visit = persistVisit(client, caregiver, at(10, 0), at(11, 30), Skill.NURSING, VisitStatus.SCHEDULED);

        EligibilityResult withoutExclusion = check(caregiver, at(10, 0), at(11, 30), Skill.NURSING);
        EligibilityResult excludingItself = checker.check(
                caregiver, VisitWindow.of(at(10, 0), at(11, 30)), Skill.NURSING, visit.getId());

        assertThat(withoutExclusion.eligible()).isFalse();
        assertThat(excludingItself.eligible()).isTrue();
    }

    // --- combinations -------------------------------------------------------

    @Test
    @DisplayName("an inactive caregiver is ineligible whatever else is true")
    void anInactiveCaregiverIsIneligible() {
        Caregiver caregiver = persistInactiveCaregiver("retired", Skill.NURSING);

        assertThat(rulesOf(check(caregiver, at(10, 0), at(11, 0), Skill.NURSING)))
                .containsExactly(EligibilityRule.CAREGIVER_INACTIVE);
    }

    /**
     * When several rules fail at once the order has to be deterministic: the assignment path
     * turns the first reason into the exception, and therefore into the HTTP status.
     */
    @Test
    @DisplayName("every failure is reported, most specific first")
    void everyFailureIsReportedInRuleOrder() {
        Caregiver caregiver = persistCaregiver("pavel", LocalTime.of(8, 0), LocalTime.of(11, 0),
                Skill.PERSONAL_SUPPORT);
        persistVisit(client, caregiver, at(10, 0), at(11, 0), Skill.PERSONAL_SUPPORT, VisitStatus.SCHEDULED);

        EligibilityResult result = check(caregiver, at(10, 30), at(12, 0), Skill.NURSING);

        assertThat(rulesOf(result)).containsExactly(
                EligibilityRule.CAREGIVER_MISSING_SKILL,
                EligibilityRule.CAREGIVER_UNAVAILABLE,
                EligibilityRule.CAREGIVER_DOUBLE_BOOKED);
    }

    /**
     * The eligibility screen and the assignment path must never disagree about a caregiver.
     * They share an implementation so that holds; this proves the delegation is intact.
     */
    @Test
    @DisplayName("the batch path and the single-caregiver path give the same verdict")
    void theBatchPathAndTheSingleCaregiverPathAgree() {
        Caregiver eligible = persistCaregiver("nadia", Skill.NURSING);
        Caregiver unskilled = persistCaregiver("pavel", Skill.PERSONAL_SUPPORT);
        Caregiver booked = persistCaregiver("sam", Skill.NURSING);
        persistVisit(client, booked, at(10, 0), at(11, 30), Skill.NURSING, VisitStatus.SCHEDULED);

        List<Caregiver> all = List.of(eligible, unskilled, booked);
        VisitWindow window = VisitWindow.of(at(11, 0), at(12, 0));
        Map<UUID, EligibilityResult> batch = checker.evaluate(all, window, Skill.NURSING, null);

        assertThat(batch).hasSize(3);
        for (Caregiver caregiver : all) {
            EligibilityResult single = checker.check(caregiver, window, Skill.NURSING, null);
            assertThat(batch.get(caregiver.getId()))
                    .as("verdict for %s", caregiver.getUser().getUsername())
                    .isEqualTo(single);
        }
    }

    private EligibilityResult check(Caregiver caregiver, LocalDateTime start, LocalDateTime end, Skill skill) {
        return checker.check(caregiver, VisitWindow.of(start, end), skill, null);
    }

    private static List<EligibilityRule> rulesOf(EligibilityResult result) {
        return result.reasons().stream().map(EligibilityReason::rule).toList();
    }
}
