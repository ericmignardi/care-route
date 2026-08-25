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

    public record DayCount(LocalDate date, long total, long completed) {
    }
}
