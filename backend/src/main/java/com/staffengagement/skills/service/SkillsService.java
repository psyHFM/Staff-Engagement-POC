package com.staffengagement.skills.service;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.PageRequest;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.api.PortfolioContract;
import com.staffengagement.shared.api.SkillStrength;
import com.staffengagement.shared.api.SkillsContract;
import com.staffengagement.shared.kernel.EmployeeId;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Skills register service — the single implementor of the frozen {@link SkillsContract}.
 *
 * <p>Read-only aggregation: for every employee (via {@link EmployeeContract}),
 * reads the {@link com.staffengagement.shared.api.PortfolioSummary} (via
 * {@link PortfolioContract}), then filters, ranks, and pages skill strength entries.
 * No persistence layer is required for this story; the existing {@code portfolio_skill}
 * table is the source of truth.
 *
 * <p>Cross-module access is exclusively through the frozen {@link EmployeeContract}
 * and {@link PortfolioContract}. No {@code employee.*}, {@code portfolio.*}, or
 * repository internals are imported (ArchUnit-enforced).
 */
@Service
@RequiredArgsConstructor
public class SkillsService implements SkillsContract {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;
    private static final String DEFAULT_SORT = "years,desc";
    private static final Set<String> SORT_WHITELIST = Set.of("years", "projectCount");

    private final EmployeeContract employeeContract;
    private final PortfolioContract portfolioContract;

    @Override
    @Transactional(readOnly = true)
    public Paged<SkillStrength> strongIn(String skill, int minYears, PageRequest pageRequest) {
        return search(skill, minYears, pageRequest.offset(), pageRequest.limit(), DEFAULT_SORT);
    }

    /**
     * Module-facing search used by {@link com.staffengagement.skills.controller.SkillsController}.
     * Parses the raw {@code sort} string (whitelist: {@code years}, {@code projectCount}),
     * clamps the page size, normalizes negative {@code minYears}, and applies a stable
     * secondary sort (years desc → projectCount desc → employeeName asc → skill asc).
     */
    @Transactional(readOnly = true)
    public Paged<SkillStrength> search(String skill, int minYears, int offset, int limit, String sort) {
        requireSkillName(skill);
        String normalizedSkill = skill.trim().toLowerCase();
        int effectiveMinYears = Math.max(0, minYears);
        int effectiveLimit = clampLimit(limit);
        String effectiveSort = (sort == null || sort.isBlank()) ? DEFAULT_SORT : sort;
        Comparator<SkillStrength> comparator = parseComparator(effectiveSort);

        List<SkillStrength> matches = employeeContract.allEmployees().stream()
                .map(EmployeeSummary::id)
                .map(portfolioContract::portfolioFor)
                .filter(Objects::nonNull)
                .flatMap(p -> p.skills().stream())
                .filter(s -> s.skill() != null && s.skill().toLowerCase().contains(normalizedSkill))
                .filter(s -> s.years() >= effectiveMinYears)
                .sorted(comparator)
                .toList();

        long total = matches.size();
        List<SkillStrength> page = matches.stream()
                .skip(Math.max(0, offset))
                .limit(effectiveLimit)
                .toList();

        return new Paged<>(page, Math.max(0, offset), effectiveLimit, total);
    }

    private static void requireSkillName(String skill) {
        if (skill == null || skill.isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
    }

    private static int clampLimit(int limit) {
        if (limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    private static Comparator<SkillStrength> parseComparator(String sort) {
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        if (!SORT_WHITELIST.contains(field)) {
            throw new IllegalArgumentException("unsupported sort field: " + field);
        }
        String direction = parts.length > 1 ? parts[1].trim().toLowerCase() : "desc";
        if (!direction.equals("asc") && !direction.equals("desc")) {
            throw new IllegalArgumentException("unsupported sort direction: " + direction);
        }
        boolean ascending = "asc".equals(direction);

        Comparator<SkillStrength> primary = switch (field) {
            case "years" -> ascending
                    ? Comparator.comparingInt(SkillStrength::years)
                    : Comparator.comparingInt(SkillStrength::years).reversed();
            case "projectCount" -> ascending
                    ? Comparator.comparingInt(SkillStrength::projectCount)
                    : Comparator.comparingInt(SkillStrength::projectCount).reversed();
            default -> throw new IllegalArgumentException("unsupported sort field: " + field);
        };

        // Stable, deterministic tie-breaking for equal primary values:
        // the other strength indicator (desc), then employee name, then skill.
        Comparator<SkillStrength> tieBreak = "years".equals(field)
                ? Comparator.comparingInt(SkillStrength::projectCount).reversed()
                    .thenComparing(s -> s.employeeName() == null ? "" : s.employeeName())
                    .thenComparing(s -> s.skill() == null ? "" : s.skill())
                : Comparator.comparingInt(SkillStrength::years).reversed()
                    .thenComparing(s -> s.employeeName() == null ? "" : s.employeeName())
                    .thenComparing(s -> s.skill() == null ? "" : s.skill());

        return primary.thenComparing(tieBreak);
    }

    /** Visible for tests: clamped default limit used when a non-positive limit is supplied. */
    static int defaultLimit() {
        return DEFAULT_LIMIT;
    }

    /** Visible for tests: maximum allowed page size. */
    static int maxLimit() {
        return MAX_LIMIT;
    }
}
