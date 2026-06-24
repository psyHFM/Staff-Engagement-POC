package com.staffengagement.portfolio.controller;

import com.staffengagement.portfolio.service.PortfolioService;
import com.staffengagement.portfolio.service.PortfolioView;
import com.staffengagement.shared.kernel.EmployeeId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints for the Portfolio module (Phase 4 / {@code api-standards.yaml}):
 * {@code /api/v1} prefix, kebab-case paths, camelCase JSON, unwrapped responses,
 * uniform error envelope on failure (mapped by {@link PortfolioErrorHandler}).
 *
 * <p>RBAC is any authenticated user ({@code @PreAuthorize("isAuthenticated()")}),
 * matching {@code MISSION.md} ("any authenticated user") and the Phase 0 stub roles.
 * The controller depends on {@link PortfolioService} only — never on the repositories
 * (ArchUnit: {@code ..controller..} must not depend on {@code ..repository..}).
 */
@RestController
@RequestMapping("/api/v1")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @GetMapping("/employees/{id}/portfolio")
    @PreAuthorize("isAuthenticated()")
    public PortfolioView getPortfolio(@PathVariable Long id) {
        return portfolioService.getPortfolio(new EmployeeId(id));
    }

    @PutMapping("/employees/{id}/portfolio")
    @PreAuthorize("isAuthenticated()")
    public PortfolioView replacePortfolio(@PathVariable Long id, @RequestBody PortfolioView body) {
        // Pin the body's employeeId to the path to keep the resource self-consistent.
        PortfolioView view = new PortfolioView(id, body.skills(), body.education(), body.projects(), body.links());
        return portfolioService.replacePortfolio(new EmployeeId(id), view);
    }

    // ---- Skills sub-resource ----

    @PostMapping("/employees/{id}/portfolio/skills")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PortfolioView.SkillView> addSkill(@PathVariable Long id,
                                                             @RequestBody PortfolioView.SkillView entry) {
        PortfolioView.SkillView created = portfolioService.addSkill(new EmployeeId(id), entry);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/employees/{id}/portfolio/skills/{entryId}")
    @PreAuthorize("isAuthenticated()")
    public PortfolioView.SkillView updateSkill(@PathVariable Long id, @PathVariable Long entryId,
                                               @RequestBody PortfolioView.SkillView entry) {
        return portfolioService.updateSkill(new EmployeeId(id), entryId, entry);
    }

    @DeleteMapping("/employees/{id}/portfolio/skills/{entryId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteSkill(@PathVariable Long id, @PathVariable Long entryId) {
        portfolioService.deleteSkill(new EmployeeId(id), entryId);
        return ResponseEntity.noContent().build();
    }

    // ---- Education sub-resource ----

    @PostMapping("/employees/{id}/portfolio/education")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PortfolioView.EducationView> addEducation(@PathVariable Long id,
                                                                    @RequestBody PortfolioView.EducationView entry) {
        return ResponseEntity.status(HttpStatus.CREATED).body(portfolioService.addEducation(new EmployeeId(id), entry));
    }

    @PutMapping("/employees/{id}/portfolio/education/{entryId}")
    @PreAuthorize("isAuthenticated()")
    public PortfolioView.EducationView updateEducation(@PathVariable Long id, @PathVariable Long entryId,
                                                        @RequestBody PortfolioView.EducationView entry) {
        return portfolioService.updateEducation(new EmployeeId(id), entryId, entry);
    }

    @DeleteMapping("/employees/{id}/portfolio/education/{entryId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteEducation(@PathVariable Long id, @PathVariable Long entryId) {
        portfolioService.deleteEducation(new EmployeeId(id), entryId);
        return ResponseEntity.noContent().build();
    }

    // ---- Projects sub-resource ----

    @PostMapping("/employees/{id}/portfolio/projects")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PortfolioView.ProjectView> addProject(@PathVariable Long id,
                                                               @RequestBody PortfolioView.ProjectView entry) {
        return ResponseEntity.status(HttpStatus.CREATED).body(portfolioService.addProject(new EmployeeId(id), entry));
    }

    @PutMapping("/employees/{id}/portfolio/projects/{entryId}")
    @PreAuthorize("isAuthenticated()")
    public PortfolioView.ProjectView updateProject(@PathVariable Long id, @PathVariable Long entryId,
                                                    @RequestBody PortfolioView.ProjectView entry) {
        return portfolioService.updateProject(new EmployeeId(id), entryId, entry);
    }

    @DeleteMapping("/employees/{id}/portfolio/projects/{entryId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id, @PathVariable Long entryId) {
        portfolioService.deleteProject(new EmployeeId(id), entryId);
        return ResponseEntity.noContent().build();
    }

    // ---- Links sub-resource ----

    @PostMapping("/employees/{id}/portfolio/links")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PortfolioView.LinkView> addLink(@PathVariable Long id,
                                                          @RequestBody PortfolioView.LinkView entry) {
        return ResponseEntity.status(HttpStatus.CREATED).body(portfolioService.addLink(new EmployeeId(id), entry));
    }

    @PutMapping("/employees/{id}/portfolio/links/{entryId}")
    @PreAuthorize("isAuthenticated()")
    public PortfolioView.LinkView updateLink(@PathVariable Long id, @PathVariable Long entryId,
                                             @RequestBody PortfolioView.LinkView entry) {
        return portfolioService.updateLink(new EmployeeId(id), entryId, entry);
    }

    @DeleteMapping("/employees/{id}/portfolio/links/{entryId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteLink(@PathVariable Long id, @PathVariable Long entryId) {
        portfolioService.deleteLink(new EmployeeId(id), entryId);
        return ResponseEntity.noContent().build();
    }
}