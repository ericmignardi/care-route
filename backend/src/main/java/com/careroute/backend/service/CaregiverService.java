package com.careroute.backend.service;

import com.careroute.backend.dto.AvailabilityReplaceRequest;
import com.careroute.backend.dto.AvailabilityRequest;
import com.careroute.backend.dto.AvailabilityResponse;
import com.careroute.backend.dto.CaregiverDetailResponse;
import com.careroute.backend.dto.CaregiverResponse;
import com.careroute.backend.dto.CreateCaregiverRequest;
import com.careroute.backend.dto.PageResponse;
import com.careroute.backend.dto.UpdateCaregiverRequest;
import com.careroute.backend.exception.BusinessRuleViolationException;
import com.careroute.backend.exception.ResourceNotFoundException;
import com.careroute.backend.model.Availability;
import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.CaregiverStatus;
import com.careroute.backend.model.Role;
import com.careroute.backend.model.Skill;
import com.careroute.backend.model.User;
import com.careroute.backend.repository.CaregiverRepository;
import com.careroute.backend.repository.RoleRepository;
import com.careroute.backend.repository.UserRepository;
import com.careroute.backend.spec.CaregiverSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** FR-3.x and FR-1.4. */
@Service
@RequiredArgsConstructor
public class CaregiverService {

    private static final String CAREGIVER_ROLE = "ROLE_CAREGIVER";

    private final CaregiverRepository caregiverRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PageResponse<CaregiverResponse> findAll(String search, CaregiverStatus status, Pageable pageable) {
        return PageResponse.from(
                caregiverRepository.findAll(CaregiverSpecifications.withFilters(search, status), pageable),
                CaregiverResponse::from);
    }

    @Transactional(readOnly = true)
    public CaregiverDetailResponse findById(UUID id) {
        return CaregiverDetailResponse.from(load(id));
    }

    /** FR-1.4. Login and profile are created and linked together; neither is useful alone. */
    @Transactional
    public CaregiverDetailResponse create(CreateCaregiverRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new BusinessRuleViolationException("USERNAME_TAKEN",
                    "Username " + request.username() + " is already taken");
        }
        Role role = roleRepository.findByName(CAREGIVER_ROLE)
                .orElseThrow(() -> new IllegalStateException(CAREGIVER_ROLE + " is missing; V3__seed_roles.sql did not run"));

        User user = new User();
        user.setUsername(request.username());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setRoles(Set.of(role));
        userRepository.save(user);

        Caregiver caregiver = Caregiver.builder()
                .user(user)
                .phone(request.phone())
                .status(CaregiverStatus.ACTIVE)
                .skills(toSkillSet(request.skills()))
                .build();
        return CaregiverDetailResponse.from(caregiverRepository.save(caregiver));
    }

    /** FR-3.1 and FR-3.2. */
    @Transactional
    public CaregiverDetailResponse update(UUID id, UpdateCaregiverRequest request) {
        Caregiver caregiver = load(id);
        caregiver.getUser().setFirstName(request.firstName());
        caregiver.getUser().setLastName(request.lastName());
        caregiver.setPhone(request.phone());
        if (request.status() != null) {
            caregiver.setStatus(request.status());
        }
        if (request.skills() != null) {
            caregiver.getSkills().clear();
            caregiver.getSkills().addAll(request.skills());
        }
        return CaregiverDetailResponse.from(caregiverRepository.save(caregiver));
    }

    @Transactional(readOnly = true)
    public List<AvailabilityResponse> findAvailability(UUID caregiverId) {
        return load(caregiverId).getAvailability().stream()
                .sorted(Comparator.comparing(Availability::getDayOfWeek).thenComparing(Availability::getStartTime))
                .map(AvailabilityResponse::from)
                .toList();
    }

    /**
     * FR-3.3. Replaces the whole week in one call. Overlapping windows on the same day are
     * rejected rather than merged, because an overlap means the coordinator made a mistake.
     */
    @Transactional
    public List<AvailabilityResponse> replaceAvailability(UUID caregiverId, AvailabilityReplaceRequest request) {
        Caregiver caregiver = load(caregiverId);
        validateWindows(request.windows());

        caregiver.getAvailability().clear();
        // The flush is load-bearing: Hibernate's action queue runs inserts before
        // orphan-removal deletes, so re-submitting an unchanged week collides with the old
        // rows on uq_availability_slot unless the deletes are flushed first.
        caregiverRepository.saveAndFlush(caregiver);

        request.windows().stream()
                .sorted(Comparator.comparing(AvailabilityRequest::dayOfWeek).thenComparing(AvailabilityRequest::startTime))
                .forEach(window -> caregiver.addAvailability(Availability.builder()
                        .dayOfWeek(window.dayOfWeek())
                        .startTime(window.startTime())
                        .endTime(window.endTime())
                        .build()));

        caregiverRepository.save(caregiver);
        return caregiver.getAvailability().stream().map(AvailabilityResponse::from).toList();
    }

    private void validateWindows(List<AvailabilityRequest> windows) {
        for (AvailabilityRequest window : windows) {
            if (!window.endTime().isAfter(window.startTime())) {
                throw new BusinessRuleViolationException("INVALID_AVAILABILITY_WINDOW",
                        "An availability window must end after it starts");
            }
        }
        for (DayOfWeek day : DayOfWeek.values()) {
            List<AvailabilityRequest> sameDay = windows.stream()
                    .filter(w -> w.dayOfWeek() == day)
                    .sorted(Comparator.comparing(AvailabilityRequest::startTime))
                    .toList();
            for (int i = 1; i < sameDay.size(); i++) {
                if (sameDay.get(i).startTime().isBefore(sameDay.get(i - 1).endTime())) {
                    throw new BusinessRuleViolationException("OVERLAPPING_AVAILABILITY",
                            "Availability windows overlap on " + day);
                }
            }
        }
    }

    private Set<Skill> toSkillSet(Set<Skill> skills) {
        return skills == null || skills.isEmpty() ? EnumSet.noneOf(Skill.class) : EnumSet.copyOf(skills);
    }

    private Caregiver load(UUID id) {
        return caregiverRepository.findByIdWithUser(id)
                .orElseThrow(() -> new ResourceNotFoundException("Caregiver", id));
    }
}
