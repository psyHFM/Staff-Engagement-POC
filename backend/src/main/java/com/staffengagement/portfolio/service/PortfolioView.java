package com.staffengagement.portfolio.service;

import java.util.List;

/**
 * Module-internal read/write model for a portfolio, returned by
 * {@link PortfolioService} to the controller. Not frozen — only the
 * {@link com.staffengagement.shared.api.PortfolioContract} surface (skills) is
 * frozen. Uses plain {@code Long}/{@code Integer} fields so JSON is clean camelCase
 * (e.g. {@code projectCount}, {@code employeeId}).
 *
 * <p>{@code ownerEmail} carries the Employee record's email-shaped identity key
 * (the same string the authenticated principal name uses) so the frontend can gate
 * edit affordances on "viewer is the owner or an ADMIN" (ATSE1-39). The value is
 * resolved via {@code EmployeeContract.findByEmail(employeeId)} (or via the cached
 * field when the contract is unavailable); see {@code PortfolioService.toView}.
 *
 * <p>Null fields are excluded globally by {@code spring.jackson.default-property-inclusion:
 * non_null}; empty collections serialize as {@code []} so an unset portfolio renders
 * with each section empty rather than omitted.
 */
public record PortfolioView(
        Long employeeId,
        String ownerEmail,
        List<SkillView> skills,
        List<EducationView> education,
        List<ProjectView> projects,
        List<LinkView> links) {

    public record SkillView(Long id, String skill, int years, int projectCount) {}

    public record EducationView(Long id, String institution, String qualification, Integer startYear, Integer endYear) {}

    public record ProjectView(Long id, String name, String description, Integer startYear, Integer endYear) {}

    public record LinkView(Long id, String label, String url) {}
}