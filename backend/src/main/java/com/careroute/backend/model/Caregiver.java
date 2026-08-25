package com.careroute.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "caregivers")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Caregiver {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CaregiverStatus status;

    @ElementCollection(fetch = FetchType.LAZY)
    @BatchSize(size = 100)
    @CollectionTable(name = "caregiver_skills", joinColumns = @JoinColumn(name = "caregiver_id"))
    @Column(name = "skill", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<Skill> skills = EnumSet.noneOf(Skill.class);

    @OneToMany(mappedBy = "caregiver", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 100)
    @Builder.Default
    private List<Availability> availability = new ArrayList<>();

    @Column(nullable = false, updatable = false, name = "created_at")
    private Instant createdAt;

    @Column(nullable = false, name = "updated_at")
    private Instant updatedAt;

    public void addAvailability(Availability window) {
        window.setCaregiver(this);
        availability.add(window);
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
