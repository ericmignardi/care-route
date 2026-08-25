package com.careroute.backend.service;

import com.careroute.backend.dto.DashboardSummaryResponse;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.Client;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * FR-6.1 to FR-6.3. The dashboard is the one screen whose entire content is arithmetic over
 * the database, so its exit criterion — "dashboard numbers match the database" — is a thing
 * to assert rather than to eyeball against a seeded environment.
 *
 * <p>The week chart is the part worth testing hardest. Its two segments are drawn stacked,
 * which only reads correctly if they sum to the total; a chart whose parts do not add up to
 * its own label is worse than no chart, because it is quietly wrong rather than absent.
 */
class DashboardServiceIT extends AbstractIntegrationTest {

    /** DAY is a Tuesday, so the week the dashboard reports on opens the day before. */
    private static final LocalDate WEEK_START = DAY.with(DayOfWeek.MONDAY);

    @Autowired
    private DashboardService dashboardService;

    private Client client;
    private Caregiver caregiver;

    @BeforeEach
    void createFixtures() {
        client = persistClient("Okonkwo");
        caregiver = persistCaregiver("nadia", Skill.NURSING);
    }

    @Test
    @DisplayName("FR-6.2: the chart carries all seven days, including the empty ones")
    void theWeekChartAlwaysCarriesSevenDays() {
        persistVisit(client, caregiver, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        var week = dashboardService.summary().visitsThisWeek();

        assertThat(week).hasSize(7);
        assertThat(week).extracting(DashboardSummaryResponse.DayCount::date)
                .containsExactly(
                        WEEK_START, WEEK_START.plusDays(1), WEEK_START.plusDays(2), WEEK_START.plusDays(3),
                        WEEK_START.plusDays(4), WEEK_START.plusDays(5), WEEK_START.plusDays(6));
        assertThat(week.get(0).total()).isZero();
        assertThat(week.get(1).total()).isEqualTo(1);
    }

    @Test
    @DisplayName("FR-6.2: the assigned and unassigned segments sum to the day's total")
    void theTwoSegmentsOfADaySumToItsTotal() {
        persistVisit(client, caregiver, at(9, 0), at(10, 0), Skill.NURSING, VisitStatus.COMPLETED);
        persistVisit(client, caregiver, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);
        persistVisit(client, null, at(11, 0), at(12, 0), Skill.NURSING, VisitStatus.SCHEDULED);
        persistVisit(client, null, at(13, 0), at(14, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        DashboardSummaryResponse.DayCount tuesday = dashboardService.summary().visitsThisWeek().get(1);

        assertThat(tuesday.total()).isEqualTo(4);
        assertThat(tuesday.unassigned()).isEqualTo(2);
        assertThat(tuesday.assigned()).isEqualTo(2);
        assertThat(tuesday.assigned() + tuesday.unassigned()).isEqualTo(tuesday.total());
    }

    @Test
    @DisplayName("FR-6.2: a visit in a neighbouring week is not counted in this one")
    void visitsOutsideTheCurrentWeekAreExcluded() {
        persistVisit(client, caregiver, at(WEEK_START.minusDays(1), 10, 0), at(WEEK_START.minusDays(1), 11, 0),
                Skill.NURSING, VisitStatus.COMPLETED);
        persistVisit(client, caregiver, at(WEEK_START.plusDays(7), 10, 0), at(WEEK_START.plusDays(7), 11, 0),
                Skill.NURSING, VisitStatus.SCHEDULED);
        persistVisit(client, caregiver, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        var week = dashboardService.summary().visitsThisWeek();

        assertThat(week).extracting(DashboardSummaryResponse.DayCount::total)
                .containsExactly(0L, 1L, 0L, 0L, 0L, 0L, 0L);
    }

    @Test
    @DisplayName("FR-6.1: the three counts read the database, not each other")
    void theTilesMatchTheDatabase() {
        persistVisit(client, caregiver, at(8, 0), at(9, 0), Skill.NURSING, VisitStatus.COMPLETED);
        persistVisit(client, caregiver, at(9, 0), at(10, 0), Skill.NURSING, VisitStatus.IN_PROGRESS);
        persistVisit(client, null, at(11, 0), at(12, 0), Skill.NURSING, VisitStatus.SCHEDULED);
        // Tomorrow: counts as unassigned upcoming, but not as a visit today.
        persistVisit(client, null, at(DAY.plusDays(1), 10, 0), at(DAY.plusDays(1), 11, 0),
                Skill.NURSING, VisitStatus.SCHEDULED);

        DashboardSummaryResponse summary = dashboardService.summary();

        assertThat(summary.visitsToday()).isEqualTo(3);
        assertThat(summary.inProgress()).isEqualTo(1);
        assertThat(summary.unassignedUpcoming()).isEqualTo(2);
        assertThat(summary.unassignedUpcomingVisits()).hasSize(2);
    }

    @Test
    @DisplayName("FR-6.1: a cancelled visit is neither a completion nor a failure")
    void completionRateExcludesCancellations() {
        persistVisit(client, caregiver, at(8, 0), at(9, 0), Skill.NURSING, VisitStatus.COMPLETED);
        persistVisit(client, caregiver, at(9, 0), at(10, 0), Skill.NURSING, VisitStatus.COMPLETED);
        persistVisit(client, caregiver, at(10, 0), at(11, 0), Skill.NURSING, VisitStatus.COMPLETED);
        persistVisit(client, caregiver, at(11, 0), at(12, 0), Skill.NURSING, VisitStatus.MISSED);
        persistVisit(client, caregiver, at(12, 0), at(13, 0), Skill.NURSING, VisitStatus.CANCELLED);
        persistVisit(client, caregiver, at(13, 0), at(14, 0), Skill.NURSING, VisitStatus.SCHEDULED);

        // Three completed against one missed. The cancellation and the still-scheduled visit
        // are both excluded: neither has concluded, so neither is evidence either way.
        assertThat(dashboardService.summary().completionRate()).isEqualTo(0.75d);
    }

    @Test
    @DisplayName("FR-6.1: an empty week reports 0%, not a division by zero")
    void anEmptyWeekHasNoCompletionRate() {
        assertThat(dashboardService.summary().completionRate()).isZero();
    }
}
