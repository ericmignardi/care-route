package com.careroute.backend.spec;

import com.careroute.backend.model.Caregiver;
import com.careroute.backend.model.CaregiverStatus;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Fetch;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Filters behind {@code GET /caregivers} (FR-3.1). The caregiver's name lives on the linked
 * user, so searching by name means joining it; the same join is promoted to a fetch on the
 * data query so a page of caregivers does not fire a user query per row (NFR-6).
 */
public final class CaregiverSpecifications {

    private CaregiverSpecifications() {
    }

    public static Specification<Caregiver> withFilters(String search, CaregiverStatus status) {
        return (root, query, cb) -> {
            Join<Caregiver, Object> user = joinUser(root, query);

            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(user.get("firstName")), pattern),
                        cb.like(cb.lower(user.get("lastName")), pattern),
                        cb.like(cb.lower(user.get("username")), pattern)
                ));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * A fetch join is illegal on the count query, so that one gets a plain join. Hibernate
     * models a fetch as a join, which is what makes the cast safe.
     */
    @SuppressWarnings("unchecked")
    private static Join<Caregiver, Object> joinUser(Root<Caregiver> root, CriteriaQuery<?> query) {
        boolean counting = query != null
                && (Long.class.equals(query.getResultType()) || long.class.equals(query.getResultType()));
        if (counting) {
            return root.join("user", JoinType.INNER);
        }
        Fetch<Caregiver, Object> fetch = root.fetch("user", JoinType.INNER);
        return (Join<Caregiver, Object>) fetch;
    }
}
