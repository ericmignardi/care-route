package com.careroute.backend.dto;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * The structured verdict for one caregiver against one proposed window. Empty reasons
 * means eligible; this is the single value both the assignment path and the
 * eligibility endpoint consume.
 */
public record EligibilityResult(boolean eligible, List<EligibilityReason> reasons) {

    /** The verdict for a caregiver with nothing standing in the way. */
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
