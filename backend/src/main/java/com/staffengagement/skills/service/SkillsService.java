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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
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
    /**
     * Whitelist of sortable fields for the per-row search (ATSE1-43).
     * <ul>
     *   <li>{@code years}, {@code projectCount} — strength indicators (per-employee row).</li>
     *   <li>{@code name} — the skill's display name (asc/desc). Useful for "Alphabetical A–Z".</li>
     *   <li>{@code popularity} — accepted for forward-compatibility with the popularSkills grid
     *       but mapped to {@code years,desc} here because a per-row entry's "popularity" is
     *       effectively 1 (one employee, one row). The frontend can therefore submit
     *       {@code sort=popularity} without a 400; the visible order is the default.</li>
     * </ul>
     */
    private static final Set<String> SORT_WHITELIST = Set.of("years", "projectCount", "name", "popularity");

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

    /**
     * Aggregated "popular skills" view (ATSE1-40): groups every per-employee
     * {@link SkillStrength} by skill name (case-insensitive trim), counts distinct
     * employees, and picks the strongest holder. Sorted by employee count desc,
     * then by skill name asc for determinism. Limit is clamped to
     * {@link #maxLimit()} so {@code limit <= 0} falls back to
     * {@link #defaultLimit()}.
     *
     * <p>Blank skill names are skipped; an entry with a null skill field never
     * appears in any group. The canonical {@code skill} string of each
     * {@link SkillSummary} is the first-seen spelling (preserves the display form
     * users typed in their portfolios rather than lower-casing it).
     */
    @Transactional(readOnly = true)
    public List<SkillSummary> popularSkills(int limit) {
        int effectiveLimit = clampLimit(limit);

        // Group by lower-case trimmed skill name; preserve insertion order so the
        // canonical spelling is the first one observed in the iteration.
        Map<String, List<SkillStrength>> grouped = employeeContract.allEmployees().stream()
                .map(EmployeeSummary::id)
                .map(portfolioContract::portfolioFor)
                .filter(Objects::nonNull)
                .flatMap(p -> p.skills().stream())
                .filter(s -> s.skill() != null && !s.skill().isBlank())
                .collect(Collectors.groupingBy(
                        s -> s.skill().trim().toLowerCase(),
                        LinkedHashMap::new,
                        Collectors.toList()));

        return grouped.entrySet().stream()
                .map(e -> toSummary(e.getKey(), e.getValue()))
                .sorted(Comparator
                        .comparingInt(SkillSummary::employeeCount).reversed()
                        .thenComparing(s -> s.skill() == null ? "" : s.skill().toLowerCase()))
                .limit(effectiveLimit)
                .toList();
    }

    private static SkillSummary toSummary(String canonicalKey, List<SkillStrength> entries) {
        // Canonical (display) spelling = the first entry's original spelling.
        String displayName = entries.get(0).skill().trim();
        // Distinct employee count: a single employee with two "Angular" entries
        // counts once (their portfolio should not normally duplicate, but be safe).
        int employeeCount = (int) entries.stream()
                .map(SkillStrength::employeeId)
                .filter(Objects::nonNull)
                .distinct()
                .count();
        SkillStrength topHolder = entries.stream()
                .max(Comparator
                        .comparingInt(SkillStrength::years)
                        .thenComparing(Comparator.comparingInt(SkillStrength::projectCount))
                        .thenComparing(s -> s.employeeName() == null ? "" : s.employeeName())
                        .thenComparing(s -> s.skill() == null ? "" : s.skill().toLowerCase()))
                .orElseThrow();
        return new SkillSummary(displayName, employeeCount, topHolder);
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
            case "name" -> ascending
                    ? Comparator.comparing((SkillStrength s) -> s.skill() == null ? "" : s.skill().toLowerCase())
                    : Comparator.<SkillStrength, String>comparing(s -> s.skill() == null ? "" : s.skill().toLowerCase()).reversed();
            // "popularity" maps to years,desc: a per-row entry's popularity is effectively 1,
            // so years is the closest meaningful proxy at row level.
            case "popularity" -> Comparator.comparingInt(SkillStrength::years).reversed();
            default -> throw new IllegalArgumentException("unsupported sort field: " + field);
        };

        // Stable, deterministic tie-breaking for equal primary values:
        // the other strength indicator (desc), then employee name, then skill.
        Comparator<SkillStrength> tieBreak = "projectCount".equals(field) || "name".equals(field)
                // When sorting by projectCount, name, or popularity, years is the secondary signal.
                ? Comparator.comparingInt(SkillStrength::years).reversed()
                    .thenComparing(s -> s.employeeName() == null ? "" : s.employeeName())
                    .thenComparing(s -> s.skill() == null ? "" : s.skill())
                // When sorting by years, the other strength indicator (projectCount) is the tie-break.
                : Comparator.comparingInt(SkillStrength::projectCount).reversed()
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
