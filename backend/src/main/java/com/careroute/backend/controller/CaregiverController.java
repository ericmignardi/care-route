package com.careroute.backend.controller;

import com.careroute.backend.dto.AvailabilityReplaceRequest;
import com.careroute.backend.dto.AvailabilityResponse;
import com.careroute.backend.dto.CaregiverDetailResponse;
import com.careroute.backend.dto.CaregiverResponse;
import com.careroute.backend.dto.CreateCaregiverRequest;
import com.careroute.backend.dto.PageResponse;
import com.careroute.backend.dto.UpdateCaregiverRequest;
import com.careroute.backend.model.CaregiverStatus;
import com.careroute.backend.service.CaregiverService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * FR-3.x. The default sort is by surname because that is how a coordinator scanning a roster
 * looks for someone.
 */
@RestController
@RequestMapping("/api/v1/caregivers")
@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
@RequiredArgsConstructor
public class CaregiverController {

    private final CaregiverService caregiverService;

    @GetMapping
    public PageResponse<CaregiverResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CaregiverStatus status,
            @PageableDefault(size = 20, sort = "user.lastName", direction = Sort.Direction.ASC) Pageable pageable) {
        return caregiverService.findAll(search, status, pageable);
    }

    @GetMapping("/{id}")
    public CaregiverDetailResponse get(@PathVariable UUID id) {
        return caregiverService.findById(id);
    }

    @PostMapping
    public ResponseEntity<CaregiverDetailResponse> create(@Valid @RequestBody CreateCaregiverRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(caregiverService.create(request));
    }

    @PutMapping("/{id}")
    public CaregiverDetailResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateCaregiverRequest request) {
        return caregiverService.update(id, request);
    }

    @GetMapping("/{id}/availability")
    public List<AvailabilityResponse> availability(@PathVariable UUID id) {
        return caregiverService.findAvailability(id);
    }

    @PutMapping("/{id}/availability")
    public List<AvailabilityResponse> replaceAvailability(@PathVariable UUID id,
                                                          @Valid @RequestBody AvailabilityReplaceRequest request) {
        return caregiverService.replaceAvailability(id, request);
    }
}
