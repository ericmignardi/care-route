package com.careroute.backend.dto;

import java.time.LocalDate;
import java.util.List;

/** FR-6.1 to FR-6.3. */
public record DashboardSummaryResponse(
        long visitsToday,
        long unassignedUpcoming,
        long inProgress,
        double completionRate,
        List<DayCount> visitsThisWeek,
        List<VisitResponse> unassignedUpcomingVisits
) {

    /** One bar of the week chart. {@code assigned} and {@code unassigned} sum to {@code total}. */
    public record DayCount(LocalDate date, long total, long completed, long unassigned) {

        public long assigned() {
            return total - unassigned;
        }
    }
}
