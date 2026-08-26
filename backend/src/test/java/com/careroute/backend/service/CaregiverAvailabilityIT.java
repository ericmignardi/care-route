package com.careroute.backend.service;

import com.careroute.backend.dto.AvailabilityReplaceRequest;
import com.careroute.backend.dto.AvailabilityRequest;
import com.careroute.backend.dto.AvailabilityResponse;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.Skill;
import com.careroute.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The whole-week replace makes resubmitting an unchanged week the ordinary case: a
 * coordinator who changes only Thursday resubmits the rest untouched.
 *
 * <p>That was the broken case. Clearing the collection and re-adding equal rows in one
 * persistence context put the inserts ahead of the orphan-removal deletes, so the new row
 * collided with the old on {@code uq_availability_slot}. These tests are about that ordering.
 */
class CaregiverAvailabilityIT extends AbstractIntegrationTest {

    @Autowired
    private CaregiverService caregiverService;

    private Caregiver caregiver;

    @BeforeEach
    void createACaregiverWorkingMondayAndTuesday() {
        caregiver = persistCaregiverWithoutAvailability("thomas", Skill.PERSONAL_SUPPORT);
        caregiverService.replaceAvailability(caregiver.getId(), week(
                window(DayOfWeek.MONDAY, 8, 16),
                window(DayOfWeek.TUESDAY, 8, 16)));
    }

    @Test
    @DisplayName("resubmitting an unchanged week succeeds")
    void replacingAWeekWithAnIdenticalOneIsAccepted() {
        List<AvailabilityResponse> saved = caregiverService.replaceAvailability(caregiver.getId(), week(
                window(DayOfWeek.MONDAY, 8, 16),
                window(DayOfWeek.TUESDAY, 8, 16)));

        assertThat(saved).hasSize(2);
        assertThat(availabilityRepository.count()).isEqualTo(2);
    }

    @Test
    @DisplayName("adding a day keeps the untouched ones and does not duplicate them")
    void addingADayLeavesTheOthersIntact() {
        List<AvailabilityResponse> saved = caregiverService.replaceAvailability(caregiver.getId(), week(
                window(DayOfWeek.MONDAY, 8, 16),
                window(DayOfWeek.TUESDAY, 8, 16),
                window(DayOfWeek.SATURDAY, 9, 17)));

        assertThat(saved).hasSize(3);
        assertThat(saved).extracting(AvailabilityResponse::dayOfWeek)
                .containsExactly(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.SATURDAY);
    }

    @Test
    @DisplayName("a day left out of the submission is deleted")
    void removingADayDropsIt() {
        List<AvailabilityResponse> saved = caregiverService.replaceAvailability(caregiver.getId(), week(
                window(DayOfWeek.MONDAY, 8, 16)));

        assertThat(saved).hasSize(1);
        assertThat(availabilityRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("an empty submission clears the week")
    void submittingNoWindowsLeavesTheCaregiverUnavailable() {
        assertThat(caregiverService.replaceAvailability(caregiver.getId(), week())).isEmpty();
        assertThat(availabilityRepository.count()).isZero();
    }

    private static AvailabilityReplaceRequest week(AvailabilityRequest... windows) {
        return new AvailabilityReplaceRequest(List.of(windows));
    }

    private static AvailabilityRequest window(DayOfWeek day, int fromHour, int toHour) {
        return new AvailabilityRequest(day, LocalTime.of(fromHour, 0), LocalTime.of(toHour, 0));
    }
}
