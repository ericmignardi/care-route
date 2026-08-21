package com.careroute.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "visits")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Visit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "caregiver_id")
    private Caregiver caregiver;

    @Column(nullable = false, name = "scheduled_start")
    private LocalDateTime scheduledStart;

    @Column(nullable = false, name = "scheduled_end")
    private LocalDateTime scheduledEnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "required_skill")
    private Skill requiredSkill;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VisitStatus status;

    @Column(name = "checked_in_at")
    private Instant checkedInAt;

    @Column(name = "checked_out_at")
    private Instant checkedOutAt;

    @Column(length = 2000)
    private String notes;

    @OneToMany(mappedBy = "visit", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<VisitTask> tasks = new ArrayList<>();

    @Version
    @Column(nullable = false)
    private int version;

    @Column(nullable = false, updatable = false, name = "created_at")
    private Instant createdAt;

    @Column(nullable = false, name = "updated_at")
    private Instant updatedAt;

    public boolean canTransitionTo(VisitStatus target) {
        if (status == target) {
            return false;
        }
        return switch (status) {
            case SCHEDULED -> target == VisitStatus.IN_PROGRESS
                    || target == VisitStatus.CANCELLED
                    || target == VisitStatus.MISSED;
            case IN_PROGRESS -> target == VisitStatus.COMPLETED;
            case COMPLETED, CANCELLED, MISSED -> false;
        };
    }

    public void addTask(VisitTask task) {
        task.setVisit(this);
        tasks.add(task);
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
