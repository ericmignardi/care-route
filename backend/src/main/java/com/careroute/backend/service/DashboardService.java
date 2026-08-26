package com.careroute.backend.service;

import com.careroute.backend.dto.DashboardSummaryResponse;
import com.careroute.backend.dto.VisitResponse;
import com.careroute.backend.dto.VisitTimeSlice;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** FR-6.x. */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int UNASSIGNED_LIST_SIZE = 10;

    private final VisitRepository visitRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary() {
        LocalDate today = LocalDate.now(clock);
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);

        List<VisitTimeSlice> week = visitRepository.findTimeSlicesBetween(
                weekStart.atStartOfDay(), weekStart.plusWeeks(1).atStartOfDay());

        return new DashboardSummaryResponse(
                visitRepository.countByScheduledStartGreaterThanEqualAndScheduledStartLessThan(
                        startOfToday, startOfToday.plusDays(1)),
                visitRepository.countByCaregiverIsNullAndStatusAndScheduledStartGreaterThanEqual(
                        VisitStatus.SCHEDULED, startOfToday),
                visitRepository.countByStatus(VisitStatus.IN_PROGRESS),
                completionRate(week),
                dayCounts(weekStart, week),
                unassignedUpcoming(startOfToday)
        );
    }

    /**
     * COMPLETED over (COMPLETED + MISSED) for the current week. Cancellations are excluded:
     * a visit the agency cancelled was never an opportunity to complete.
     */
    private double completionRate(List<VisitTimeSlice> week) {
        long completed = week.stream().filter(s -> s.status() == VisitStatus.COMPLETED).count();
        long missed = week.stream().filter(s -> s.status() == VisitStatus.MISSED).count();
        long concluded = completed + missed;
        return concluded == 0 ? 0d : (double) completed / concluded;
    }

    /**
     * FR-6.2. Every day is present, including the empty ones — a missing day would shift the
     * next one into its slot and quietly redraw the week.
     */
    private List<DashboardSummaryResponse.DayCount> dayCounts(LocalDate weekStart, List<VisitTimeSlice> week) {
        Map<LocalDate, List<VisitTimeSlice>> byDay = week.stream()
                .collect(Collectors.groupingBy(slice -> slice.scheduledStart().toLocalDate()));

        List<DashboardSummaryResponse.DayCount> counts = new ArrayList<>(7);
        for (int i = 0; i < 7; i++) {
            LocalDate day = weekStart.plusDays(i);
            List<VisitTimeSlice> slices = byDay.getOrDefault(day, List.of());
            counts.add(new DashboardSummaryResponse.DayCount(
                    day,
                    slices.size(),
                    slices.stream().filter(s -> s.status() == VisitStatus.COMPLETED).count(),
                    slices.stream().filter(VisitTimeSlice::unassigned).count()));
        }
        return counts;
    }

    /** FR-6.3. */
    private List<VisitResponse> unassignedUpcoming(LocalDateTime from) {
        return visitRepository
                .findByCaregiverIsNullAndStatusAndScheduledStartGreaterThanEqualOrderByScheduledStartAsc(
                        VisitStatus.SCHEDULED, from, PageRequest.of(0, UNASSIGNED_LIST_SIZE))
                .stream()
                .map(VisitResponse::from)
                .toList();
    }
}
