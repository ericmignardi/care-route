package com.careroute.backend.dto;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public record EligibilityResult(boolean eligible, List<EligibilityReason> reasons) {

    public static final EligibilityResult ELIGIBLE = new EligibilityResult(true, List.of());

    /** Sorts by {@link EligibilityRule} declaration order so the primary reason is first. */
    public static EligibilityResult of(List<EligibilityReason> reasons) {
        if (reasons.isEmpty()) {
            return ELIGIBLE;
        }
        List<EligibilityReason> ordered = new ArrayList<>(reasons);
        ordered.sort(Comparator.comparing(EligibilityReason::rule));
        return new EligibilityResult(false, List.copyOf(ordered));
    }

    public EligibilityReason primaryReason() {
        return reasons.isEmpty() ? null : reasons.getFirst();
    }
}
