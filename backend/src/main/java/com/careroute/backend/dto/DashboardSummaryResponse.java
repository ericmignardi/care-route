package com.careroute.backend.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * FR-6.1 to FR-6.3.
 *
 * <p>{@code completionRate} is COMPLETED over (COMPLETED + MISSED) across the current
 * week — cancellations are excluded because a visit cancelled by the agency was never
 * a chance to complete, and counting it as a failure would punish good coordination.
 * The rate is 0 when nothing has concluded yet.
 */
public record DashboardSummaryResponse(
        long visitsToday,
        long unassignedUpcoming,
        long inProgress,
        double completionRate,
        List<DayCount> visitsThisWeek,
        List<VisitResponse> unassignedUpcomingVisits
) {

    /**
     * One bar of the week chart. {@code unassigned} is the share of {@code total} that
     * nobody is coming to — the chart stacks it on top of the assigned remainder, so the
     * two segments must sum to the total rather than being independent measures.
     */
    public record DayCount(LocalDate date, long total, long completed, long unassigned) {

        /** The pine segment: what is left once the clay share is taken off the top. */
        public long assigned() {
            return total - unassigned;
        }
    }
}
