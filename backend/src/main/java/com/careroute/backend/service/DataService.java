package com.careroute.backend.service;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
public class DataService {

    // Only users with ROLE_ADMIN can execute this business logic
    @PreAuthorize("hasRole('ADMIN')")
    public String performSensitiveAdminTask() {
        return "Sensitive administrative task completed successfully!";
    }

    // Users with ROLE_USER or ROLE_ADMIN can execute this business logic
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public String getGeneralUserData() {
        return "Here is some general user data.";
    }
}
