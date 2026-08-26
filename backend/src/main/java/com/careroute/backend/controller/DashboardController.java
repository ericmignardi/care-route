package com.careroute.backend.controller;

import com.careroute.backend.dto.DashboardSummaryResponse;
import com.careroute.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** FR-6.x. */
@RestController
@RequestMapping("/api/v1/dashboard")
@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public DashboardSummaryResponse summary() {
        return dashboardService.summary();
    }
}
