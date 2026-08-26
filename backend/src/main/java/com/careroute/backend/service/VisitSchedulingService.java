package com.careroute.backend.service;

import com.careroute.backend.dto.CaregiverEligibilityResponse;
import com.careroute.backend.dto.EligibilityReason;
import com.careroute.backend.dto.EligibilityResult;
import com.careroute.backend.dto.PageResponse;
import com.careroute.backend.dto.ScheduleVisitRequest;
import com.careroute.backend.dto.VisitDetailResponse;
import com.careroute.backend.dto.VisitResponse;
import com.careroute.backend.exception.BusinessRuleViolationException;
import com.careroute.backend.exception.ResourceNotFoundException;
import com.careroute.backend.exception.SchedulingConflictException;
import com.careroute.backend.model.CarePlanTask;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.CaregiverStatus;
import com.careroute.backend.model.Client;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.model.VisitTask;
import com.careroute.backend.model.VisitWindow;
import com.careroute.backend.repository.CaregiverRepository;
import com.careroute.backend.repository.ClientRepository;
import com.careroute.backend.repository.VisitRepository;
import com.careroute.backend.security.CustomUserDetails;
import com.careroute.backend.spec.VisitSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Coordinator-side visit operations: schedule, assign, cancel, and the reads behind the
 * schedule board.
 *
 * <p>Every path that puts a caregiver on a visit funnels through {@link #enforceEligibility},
 * so there is no second copy of BR-1, BR-2 or BR-3 anywhere in this class.
 */
@Service
@RequiredArgsConstructor
public class VisitSchedulingService {

    private final VisitRepository visitRepository;
    private final ClientRepository clientRepository;
    private final CaregiverRepository caregiverRepository;
    private final VisitEligibilityChecker eligibilityChecker;
    private final VisitAccessGuard accessGuard;

    /**
     * FR-4.1 and FR-4.6. The care plan is copied onto the visit at creation rather than
     * referenced, so editing it later never rewrites what a completed visit involved.
     */
    @Transactional
    public VisitDetailResponse schedule(ScheduleVisitRequest request) {
        VisitWindow window = VisitWindow.of(request.scheduledStart(), request.scheduledEnd());

        Client client = clientRepository.findByIdWithCarePlanTasks(request.clientId())
                .orElseThrow(() -> new ResourceNotFoundException("Client", request.clientId()));

        Caregiver caregiver = null;
        if (request.caregiverId() != null) {
            caregiver = loadCaregiver(request.caregiverId());
            enforceEligibility(caregiver, window, request.requiredSkill(), null);
        }

        Visit visit = Visit.builder()
                .client(client)
                .caregiver(caregiver)
                .scheduledStart(window.start())
                .scheduledEnd(window.end())
                .requiredSkill(request.requiredSkill())
                .status(VisitStatus.SCHEDULED)
                .build();

        for (CarePlanTask carePlanTask : client.getCarePlanTasks()) {
            visit.addTask(VisitTask.builder()
                    .description(carePlanTask.getDescription())
                    .sortOrder(carePlanTask.getSortOrder())
                    .completed(false)
                    .build());
        }

        return VisitDetailResponse.from(visitRepository.save(visit));
    }

    /**
     * FR-4.2. The visit being reassigned is excluded from the overlap check, or it would be
     * reported as conflicting with itself.
     */
    @Transactional
    public VisitDetailResponse assign(UUID visitId, UUID caregiverId) {
        Visit visit = loadVisit(visitId);
        if (visit.getStatus() != VisitStatus.SCHEDULED) {
            throw new SchedulingConflictException("VISIT_NOT_SCHEDULED",
                    "Only a scheduled visit can be assigned; this one is " + visit.getStatus());
        }

        Caregiver caregiver = loadCaregiver(caregiverId);
        enforceEligibility(caregiver, VisitWindow.of(visit), visit.getRequiredSkill(), visit.getId());

        visit.setCaregiver(caregiver);
        return VisitDetailResponse.from(visitRepository.save(visit));
    }

    /** FR-4.3, BR-6. Legality of the transition belongs to the entity, not to this method. */
    @Transactional
    public VisitDetailResponse cancel(UUID visitId) {
        Visit visit = loadVisit(visitId);
        if (!visit.canTransitionTo(VisitStatus.CANCELLED)) {
            throw new SchedulingConflictException("ILLEGAL_STATUS_TRANSITION",
                    "A " + visit.getStatus() + " visit cannot be cancelled");
        }
        visit.setStatus(VisitStatus.CANCELLED);
        return VisitDetailResponse.from(visitRepository.save(visit));
    }

    /** FR-4.4. */
    @Transactional(readOnly = true)
    public PageResponse<VisitResponse> findAll(LocalDateTime from, LocalDateTime to, UUID caregiverId,
                                               UUID clientId, VisitStatus status, Pageable pageable) {
        return PageResponse.from(
                visitRepository.findAll(VisitSpecifications.withFilters(from, to, caregiverId, clientId, status), pageable),
                VisitResponse::from);
    }

    /** FR-4.7, gated by BR-7. */
    @Transactional(readOnly = true)
    public VisitDetailResponse findById(UUID visitId, CustomUserDetails principal) {
        Visit visit = visitRepository.findByIdWithDetails(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Visit", visitId));
        accessGuard.requireViewAccess(visit, principal);
        return VisitDetailResponse.from(visit);
    }

    /** FR-5.1. */
    @Transactional(readOnly = true)
    public List<VisitResponse> findMyVisits(CustomUserDetails principal, LocalDate date) {
        Caregiver caregiver = accessGuard.requireCaregiverProfile(principal);
        LocalDateTime start = date.atStartOfDay();
        return visitRepository
                .findByCaregiverIdAndScheduledStartGreaterThanEqualAndScheduledStartLessThanOrderByScheduledStartAsc(
                        caregiver.getId(), start, start.plusDays(1))
                .stream()
                .map(VisitResponse::from)
                .toList();
    }

    /**
     * FR-3.4. Every active caregiver, eligible or not, each carrying its reasons. The same
     * checker that would reject the assignment produces these answers, so the screen can
     * never offer a caregiver the API would then refuse.
     */
    @Transactional(readOnly = true)
    public List<CaregiverEligibilityResponse> findEligibleCaregivers(LocalDateTime start, LocalDateTime end,
                                                                     Skill requiredSkill, UUID excludedVisitId) {
        VisitWindow window = VisitWindow.of(start, end);
        List<Caregiver> caregivers = caregiverRepository.findAllByStatus(CaregiverStatus.ACTIVE);
        Map<UUID, EligibilityResult> results =
                eligibilityChecker.evaluate(caregivers, window, requiredSkill, excludedVisitId);

        return caregivers.stream()
                .map(caregiver -> CaregiverEligibilityResponse.from(
                        caregiver, results.getOrDefault(caregiver.getId(), EligibilityResult.ELIGIBLE)))
                .sorted(Comparator.comparing((CaregiverEligibilityResponse r) -> !r.eligible())
                        .thenComparing(CaregiverEligibilityResponse::lastName)
                        .thenComparing(CaregiverEligibilityResponse::firstName))
                .toList();
    }

    /**
     * Turns a failed verdict into the right status: a double booking conflicts with existing
     * state (409), everything else is unprocessable (422).
     */
    private void enforceEligibility(Caregiver caregiver, VisitWindow window, Skill requiredSkill, UUID excludedVisitId) {
        EligibilityResult result = eligibilityChecker.check(caregiver, window, requiredSkill, excludedVisitId);
        if (result.eligible()) {
            return;
        }
        EligibilityReason reason = result.primaryReason();
        if (reason.rule().isConflict()) {
            throw new SchedulingConflictException(reason.rule().name(), reason.message());
        }
        throw new BusinessRuleViolationException(reason.rule().name(), reason.message());
    }

    private Visit loadVisit(UUID visitId) {
        return visitRepository.findById(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Visit", visitId));
    }

    private Caregiver loadCaregiver(UUID caregiverId) {
        return caregiverRepository.findByIdWithUser(caregiverId)
                .orElseThrow(() -> new ResourceNotFoundException("Caregiver", caregiverId));
    }
}
