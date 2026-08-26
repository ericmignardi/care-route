package com.careroute.backend.spec;

import com.careroute.backend.model.Client;
import com.careroute.backend.model.ClientStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/** Filters behind {@code GET /clients} (FR-2.2). */
public final class ClientSpecifications {

    private ClientSpecifications() {
    }

    public static Specification<Client> withFilters(String search, ClientStatus status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("firstName")), pattern),
                        cb.like(cb.lower(root.get("lastName")), pattern),
                        cb.like(cb.lower(cb.concat(cb.concat(root.get("firstName"), " "), root.get("lastName"))), pattern)
                ));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
