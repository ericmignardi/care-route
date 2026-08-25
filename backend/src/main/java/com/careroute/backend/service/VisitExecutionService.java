package com.careroute.backend.service;

import com.careroute.backend.config.SchedulingProperties;
import com.careroute.backend.dto.VisitDetailResponse;
import com.careroute.backend.exception.ResourceNotFoundException;
import com.careroute.backend.exception.SchedulingConflictException;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.model.VisitTask;
import com.careroute.backend.repository.VisitRepository;
import com.careroute.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Field operations performed by the caregiver who owns the visit: check-in (BR-4),
 * check-out (BR-5), task completion and notes.
 *
 * <p>Every method here re-establishes ownership through {@link VisitAccessGuard} rather than
 * trusting the id in the URL. The three-line cost of that is what makes BR-7 true rather than
 * merely intended.
 */
@Service
@RequiredArgsConstructor
public class VisitExecutionService {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final VisitRepository visitRepository;
    private final VisitAccessGuard accessGuard;
    private final SchedulingProperties schedulingProperties;
    private final Clock clock;

    /**
     * BR-4. Permitted only on a SCHEDULED visit and only within the configured tolerance of
     * the scheduled start, in either direction — arriving two hours early is as much a data
     * error as arriving two hours late.
     */
    @Transactional
    public VisitDetailResponse checkIn(UUID visitId, CustomUserDetails principal) {
        Visit visit = loadOwnedVisit(visitId, principal);

        if (!visit.canTransitionTo(VisitStatus.IN_PROGRESS)) {
            throw new SchedulingConflictException("ILLEGAL_STATUS_TRANSITION",
                    "A " + visit.getStatus() + " visit cannot be checked into");
        }

        int tolerance = schedulingProperties.getCheckInToleranceMinutes();
        LocalDateTime now = LocalDateTime.now(clock);
        long minutesOff = Math.abs(Duration.between(visit.getScheduledStart(), now).toMinutes());
        if (minutesOff > tolerance) {
            throw new SchedulingConflictException("CHECK_IN_OUTSIDE_TOLERANCE",
                    "Check-in opens within " + tolerance + " minutes of "
                            + visit.getScheduledStart().format(TIME));
        }

        visit.setStatus(VisitStatus.IN_PROGRESS);
        visit.setCheckedInAt(clock.instant());
        return VisitDetailResponse.from(visitRepository.save(visit));
    }

    /** BR-5. Check-out is the only route from IN_PROGRESS to COMPLETED. */
    @Transactional
    public VisitDetailResponse checkOut(UUID visitId, CustomUserDetails principal) {
        Visit visit = loadOwnedVisit(visitId, principal);

        if (!visit.canTransitionTo(VisitStatus.COMPLETED)) {
            throw new SchedulingConflictException("ILLEGAL_STATUS_TRANSITION",
                    "A " + visit.getStatus() + " visit cannot be checked out of");
        }

        visit.setStatus(VisitStatus.COMPLETED);
        visit.setCheckedOutAt(clock.instant());
        return VisitDetailResponse.from(visitRepository.save(visit));
    }

    /**
     * FR-5.3. Tasks are completed during the visit, so the visit must be in progress: a task
     * ticked before check-in or after check-out is not evidence of anything.
     */
    @Transactional
    public VisitDetailResponse completeTask(UUID visitId, UUID taskId, CustomUserDetails principal) {
        Visit visit = loadOwnedVisit(visitId, principal);

        if (visit.getStatus() != VisitStatus.IN_PROGRESS) {
            throw new SchedulingConflictException("VISIT_NOT_IN_PROGRESS",
                    "Tasks can only be completed while the visit is in progress");
        }

        VisitTask task = visit.getTasks().stream()
                .filter(t -> t.getId().equals(taskId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Task " + taskId + " is not on this visit"));

        if (!task.isCompleted()) {
            task.markComplete();
        }
        return VisitDetailResponse.from(visitRepository.save(visit));
    }

    /** FR-5.4. */
    @Transactional
    public VisitDetailResponse addNote(UUID visitId, String notes, CustomUserDetails principal) {
        Visit visit = loadOwnedVisit(visitId, principal);

        if (visit.getStatus() == VisitStatus.CANCELLED) {
            throw new SchedulingConflictException("ILLEGAL_STATUS_TRANSITION",
                    "A cancelled visit cannot be annotated");
        }

        visit.setNotes(notes);
        return VisitDetailResponse.from(visitRepository.save(visit));
    }

    private Visit loadOwnedVisit(UUID visitId, CustomUserDetails principal) {
        Visit visit = visitRepository.findByIdWithDetails(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Visit", visitId));
        accessGuard.requireOwnership(visit, principal);
        return visit;
    }
}
