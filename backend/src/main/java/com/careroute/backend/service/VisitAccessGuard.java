package com.careroute.backend.service;

import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.Visit;
import com.careroute.backend.repository.CaregiverRepository;
import com.careroute.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

/**
 * BR-7 — a caregiver may read or act on a visit only if they are its assigned caregiver.
 *
 * <p>This cannot be expressed as a role annotation. "Own only" is a relationship between the
 * authenticated principal and a specific row, which is not knowable until the row is loaded,
 * so it lives here at the service layer instead of in {@code @PreAuthorize}. Role checks
 * still guard the endpoints; this guards the data.
 */
@Component
@RequiredArgsConstructor
public class VisitAccessGuard {

    private static final Set<String> COORDINATION_ROLES = Set.of("ROLE_ADMIN", "ROLE_COORDINATOR");

    private final CaregiverRepository caregiverRepository;

    /**
     * Read access: coordinators and admins see every visit, a caregiver sees only their own.
     */
    public void requireViewAccess(Visit visit, CustomUserDetails principal) {
        if (hasCoordinationRole(principal)) {
            return;
        }
        requireOwnership(visit, principal);
    }

    /**
     * Field actions — check in, check out, complete a task, add a note. Deliberately stricter
     * than {@link #requireViewAccess}: a coordinator can see a visit but must not be able to
     * check into it, because the check-in record is the evidence that someone was there.
     *
     * @return the caregiver profile of the authenticated principal
     */
    public Caregiver requireOwnership(Visit visit, CustomUserDetails principal) {
        Caregiver caregiver = requireCaregiverProfile(principal);
        UUID assignedId = visit.getCaregiver() == null ? null : visit.getCaregiver().getId();
        if (!caregiver.getId().equals(assignedId)) {
            throw new AccessDeniedException("This visit is assigned to a different caregiver");
        }
        return caregiver;
    }

    public Caregiver requireCaregiverProfile(CustomUserDetails principal) {
        return caregiverRepository.findByUserId(principal.getUserId())
                .orElseThrow(() -> new AccessDeniedException("This account has no caregiver profile"));
    }

    public boolean hasCoordinationRole(CustomUserDetails principal) {
        return principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(COORDINATION_ROLES::contains);
    }
}
