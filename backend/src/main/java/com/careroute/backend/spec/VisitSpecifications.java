package com.careroute.backend.spec;

import com.careroute.backend.model.Visit;
import com.careroute.backend.model.VisitStatus;
import jakarta.persistence.criteria.Fetch;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Composes the optional filters behind {@code GET /visits} (FR-4.4). Every filter is
 * independently optional, which is why this is a Specification rather than a combinatorial
 * pile of derived query methods.
 */
public final class VisitSpecifications {

    private VisitSpecifications() {
    }

    public static Specification<Visit> withFilters(LocalDateTime from, LocalDateTime to,
                                                   UUID caregiverId, UUID clientId, VisitStatus status) {
        return (root, query, cb) -> {
            fetchToOneAssociations(root, query);

            List<Predicate> predicates = new ArrayList<>();
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("scheduledStart"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThan(root.get("scheduledStart"), to));
            }
            if (caregiverId != null) {
                predicates.add(cb.equal(root.get("caregiver").get("id"), caregiverId));
            }
            if (clientId != null) {
                predicates.add(cb.equal(root.get("client").get("id"), clientId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Visit> unassigned() {
        return (root, query, cb) -> cb.isNull(root.get("caregiver"));
    }

    /**
     * Joins client and caregiver eagerly so rendering a page of visits does not fire a query
     * per row (NFR-6). Skipped on the count query, where a fetch join is both useless and
     * illegal.
     */
    private static void fetchToOneAssociations(jakarta.persistence.criteria.Root<Visit> root,
                                               jakarta.persistence.criteria.CriteriaQuery<?> query) {
        if (query == null || Long.class.equals(query.getResultType()) || long.class.equals(query.getResultType())) {
            return;
        }
        root.fetch("client", JoinType.LEFT);
        Fetch<?, ?> caregiver = root.fetch("caregiver", JoinType.LEFT);
        caregiver.fetch("user", JoinType.LEFT);
    }
}
