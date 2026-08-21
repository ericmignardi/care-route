package com.careroute.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "visit_tasks")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VisitTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false, name = "sort_order")
    private int sortOrder;

    @Column(nullable = false)
    private boolean completed;

    @Column(name = "completed_at")
    private Instant completedAt;

    public void markComplete() {
        completed = true;
        completedAt = Instant.now();
    }
}
