package com.careroute.backend.service;

import com.careroute.backend.dto.EligibilityReason;
import com.careroute.backend.dto.EligibilityResult;
import com.careroute.backend.dto.EligibilityRule;
import com.careroute.backend.model.Availability;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.CaregiverStatus;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitWindow;
import com.careroute.backend.repository.AvailabilityRepository;
import com.careroute.backend.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The single implementation of eligibility: BR-1 (no overlapping visit), BR-2 (inside
 * the caregiver's availability for that day) and BR-3 (holds the required skill).
 *
 * <p>Two consumers, one predicate. {@link VisitSchedulingService} calls it to reject an
 * invalid assignment; the {@code /visits/eligible-caregivers} endpoint calls it to explain
 * why each caregiver can or cannot take a slot. Duplicating either rule elsewhere would let
 * the two answers drift apart, which is the failure mode this class exists to prevent.
 *
 * <p>{@link #evaluate} is the real implementation and the single-caregiver form delegates to
 * it, so the batch path used by the eligibility screen issues two queries regardless of how
 * many caregivers are being considered (NFR-6), and the overlap check stays a single indexed
 * query rather than in-memory filtering (NFR-5).
 */
@Component
@RequiredArgsConstructor
public class VisitEligibilityChecker {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final int MAX_LISTED_CONFLICTS = 2;

    private final VisitRepository visitRepository;
    private final AvailabilityRepository availabilityRepository;

    /**
     * @param excludedVisitId the visit being reassigned, excluded from the overlap check so a
     *                        visit never conflicts with itself. Null when scheduling anew.
     */
    public EligibilityResult check(Caregiver caregiver, VisitWindow window, Skill requiredSkill, UUID excludedVisitId) {
        return evaluate(List.of(caregiver), window, requiredSkill, excludedVisitId)
                .getOrDefault(caregiver.getId(), EligibilityResult.ELIGIBLE);
    }

    /**
     * Evaluates every caregiver against the same window in a fixed number of queries.
     *
     * @return verdicts keyed by caregiver id, in the iteration order of the input
     */
    public Map<UUID, EligibilityResult> evaluate(Collection<Caregiver> caregivers, VisitWindow window,
                                                 Skill requiredSkill, UUID excludedVisitId) {
        if (caregivers.isEmpty()) {
            return Map.of();
        }

        List<UUID> caregiverIds = caregivers.stream().map(Caregiver::getId).toList();
        DayOfWeek dayOfWeek = window.start().getDayOfWeek();

        Map<UUID, List<Availability>> availabilityByCaregiver =
                availabilityRepository.findByCaregiverIdInAndDayOfWeek(caregiverIds, dayOfWeek).stream()
                        .collect(Collectors.groupingBy(a -> a.getCaregiver().getId()));

        Map<UUID, List<Visit>> conflictsByCaregiver =
                visitRepository.findOverlappingForCaregivers(caregiverIds, window.start(), window.end(), excludedVisitId)
                        .stream()
                        .collect(Collectors.groupingBy(v -> v.getCaregiver().getId()));

        Map<UUID, EligibilityResult> results = new LinkedHashMap<>();
        for (Caregiver caregiver : caregivers) {
            List<EligibilityReason> reasons = new ArrayList<>();

            if (caregiver.getStatus() != CaregiverStatus.ACTIVE) {
                reasons.add(EligibilityReason.of(EligibilityRule.CAREGIVER_INACTIVE, "Caregiver is inactive"));
            }
            skillReason(caregiver, requiredSkill).ifPresent(reasons::add);
            availabilityReason(window, dayOfWeek,
                    availabilityByCaregiver.getOrDefault(caregiver.getId(), List.of())).ifPresent(reasons::add);
            overlapReason(conflictsByCaregiver.getOrDefault(caregiver.getId(), List.of())).ifPresent(reasons::add);

            results.put(caregiver.getId(), EligibilityResult.of(reasons));
        }
        return results;
    }

    /** BR-3. */
    private Optional<EligibilityReason> skillReason(Caregiver caregiver, Skill requiredSkill) {
        if (requiredSkill == null || caregiver.getSkills().contains(requiredSkill)) {
            return Optional.empty();
        }
        return Optional.of(EligibilityReason.of(
                EligibilityRule.CAREGIVER_MISSING_SKILL, "Missing: " + requiredSkill.name()));
    }

    /**
     * BR-2. The window must fall entirely inside one availability window for that day, so a
     * visit spanning midnight can never qualify no matter how the day is covered.
     */
    private Optional<EligibilityReason> availabilityReason(VisitWindow window, DayOfWeek dayOfWeek,
                                                           List<Availability> windows) {
        String dayName = dayOfWeek.getDisplayName(TextStyle.FULL, Locale.CANADA) + "s";

        if (windows.isEmpty()) {
            return Optional.of(EligibilityReason.of(
                    EligibilityRule.CAREGIVER_UNAVAILABLE, "Not available " + dayName));
        }
        if (!window.isSameDay()) {
            return Optional.of(EligibilityReason.of(
                    EligibilityRule.CAREGIVER_UNAVAILABLE, "Visit spans more than one day"));
        }

        LocalTime start = window.start().toLocalTime();
        LocalTime end = window.end().toLocalTime();
        boolean covered = windows.stream()
                .anyMatch(a -> !start.isBefore(a.getStartTime()) && !end.isAfter(a.getEndTime()));
        if (covered) {
            return Optional.empty();
        }

        String offered = windows.stream()
                .sorted(Comparator.comparing(Availability::getStartTime))
                .map(a -> a.getStartTime().format(TIME) + "-" + a.getEndTime().format(TIME))
                .collect(Collectors.joining(", "));
        return Optional.of(EligibilityReason.of(
                EligibilityRule.CAREGIVER_UNAVAILABLE, "Only available " + dayName + " " + offered));
    }

    /** BR-1. */
    private Optional<EligibilityReason> overlapReason(List<Visit> conflicts) {
        if (conflicts.isEmpty()) {
            return Optional.empty();
        }
        String booked = conflicts.stream()
                .limit(MAX_LISTED_CONFLICTS)
                .map(v -> v.getScheduledStart().toLocalTime().format(TIME) + "-"
                        + v.getScheduledEnd().toLocalTime().format(TIME))
                .collect(Collectors.joining(", "));
        String suffix = conflicts.size() > MAX_LISTED_CONFLICTS
                ? " and " + (conflicts.size() - MAX_LISTED_CONFLICTS) + " more"
                : "";
        return Optional.of(EligibilityReason.of(
                EligibilityRule.CAREGIVER_DOUBLE_BOOKED, "Booked " + booked + suffix));
    }
}
