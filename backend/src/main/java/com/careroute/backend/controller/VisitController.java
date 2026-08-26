package com.careroute.backend.controller;

import com.careroute.backend.dto.AssignCaregiverRequest;
import com.careroute.backend.dto.CaregiverEligibilityResponse;
import com.careroute.backend.dto.PageResponse;
import com.careroute.backend.dto.ScheduleVisitRequest;
import com.careroute.backend.dto.VisitDetailResponse;
import com.careroute.backend.dto.VisitNoteRequest;
import com.careroute.backend.dto.VisitResponse;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.VisitStatus;
import com.careroute.backend.security.CustomUserDetails;
import com.careroute.backend.service.VisitExecutionService;
import com.careroute.backend.service.VisitSchedulingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Coordination endpoints carry a role annotation. The per-visit endpoints do not: "the
 * caregiver this visit is assigned to" is not a role but a relationship to a specific row,
 * so it is checked in the service layer once the row is loaded (BR-7).
 */
@RestController
@RequestMapping("/api/v1/visits")
@RequiredArgsConstructor
public class VisitController {

    private final VisitSchedulingService schedulingService;
    private final VisitExecutionService executionService;

    /** FR-4.4. */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    public PageResponse<VisitResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) UUID caregiverId,
            @RequestParam(required = false) UUID clientId,
            @RequestParam(required = false) VisitStatus status,
            @PageableDefault(size = 20, sort = "scheduledStart", direction = Sort.Direction.ASC) Pageable pageable) {
        return schedulingService.findAll(from, to, caregiverId, clientId, status, pageable);
    }

    /** FR-4.1. */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    public ResponseEntity<VisitDetailResponse> schedule(@Valid @RequestBody ScheduleVisitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(schedulingService.schedule(request));
    }

    /** FR-3.4. */
    @GetMapping("/eligible-caregivers")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    public List<CaregiverEligibilityResponse> eligibleCaregivers(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) Skill requiredSkill,
            @RequestParam(required = false) UUID visitId) {
        return schedulingService.findEligibleCaregivers(start, end, requiredSkill, visitId);
    }

    /** FR-5.1. */
    @GetMapping("/my")
    public List<VisitResponse> myVisits(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return schedulingService.findMyVisits(principal, date == null ? LocalDate.now() : date);
    }

    /** FR-4.7, gated by BR-7. */
    @GetMapping("/{id}")
    public VisitDetailResponse get(@PathVariable UUID id, @AuthenticationPrincipal CustomUserDetails principal) {
        return schedulingService.findById(id, principal);
    }

    /** FR-4.2. */
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    public VisitDetailResponse assign(@PathVariable UUID id, @Valid @RequestBody AssignCaregiverRequest request) {
        return schedulingService.assign(id, request.caregiverId());
    }

    /** FR-4.3, BR-6. */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    public VisitDetailResponse cancel(@PathVariable UUID id) {
        return schedulingService.cancel(id);
    }

    /** FR-5.2, BR-4. */
    @PostMapping("/{id}/check-in")
    public VisitDetailResponse checkIn(@PathVariable UUID id, @AuthenticationPrincipal CustomUserDetails principal) {
        return executionService.checkIn(id, principal);
    }

    /** FR-5.5, BR-5. */
    @PostMapping("/{id}/check-out")
    public VisitDetailResponse checkOut(@PathVariable UUID id, @AuthenticationPrincipal CustomUserDetails principal) {
        return executionService.checkOut(id, principal);
    }

    /** FR-5.3. */
    @PostMapping("/{id}/tasks/{taskId}/complete")
    public VisitDetailResponse completeTask(@PathVariable UUID id, @PathVariable UUID taskId,
                                            @AuthenticationPrincipal CustomUserDetails principal) {
        return executionService.completeTask(id, taskId, principal);
    }

    /** FR-5.4. */
    @PostMapping("/{id}/notes")
    public VisitDetailResponse addNote(@PathVariable UUID id, @Valid @RequestBody VisitNoteRequest request,
                                       @AuthenticationPrincipal CustomUserDetails principal) {
        return executionService.addNote(id, request.notes(), principal);
    }
}
