package com.staffengagement.portfolio.service;

import com.staffengagement.portfolio.domain.*;
import com.staffengagement.portfolio.repository.*;
import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.PortfolioContract;
import com.staffengagement.shared.api.PortfolioSummary;
import com.staffengagement.shared.api.SkillStrength;
import com.staffengagement.shared.kernel.EmployeeId;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Portfolio service — the single implementor of the frozen
 * {@link PortfolioContract} and the orchestration point for the module's read/write
 * paths (Controller → Service → Repository; the controller never touches the
 * repositories).
 *
 * <p>Cross-module access is exclusively through the frozen {@link EmployeeContract}
 * ({@code exists} for owner validation, {@code findById} to resolve the display name on
 * {@link SkillStrength}). No Employee module impl/repository/domain is imported
 * (ArchUnit-enforced). The {@link EmployeeContract} is injected via
 * {@link ObjectProvider} so the monolith stays bootable on its own splice before the
 * Employee module's {@code EmployeeContract} implementor lands (ROADMAP §parallel
 * phases — same defensive pattern as the Task controller). Validation and
 * name-resolution activate automatically once the Employee module is merged.
 */
@Service
@RequiredArgsConstructor
public class PortfolioService implements PortfolioContract {

    private final PortfolioRepository portfolioRepository;
    private final PortfolioSkillRepository skillRepository;
    private final PortfolioEducationRepository educationRepository;
    private final PortfolioProjectRepository projectRepository;
    private final PortfolioLinkRepository linkRepository;
    private final ObjectProvider<EmployeeContract> employeeContractProvider;

    // ---- Frozen contract (consumed by the Phase 5 Skills register) ----

    /**
     * {@inheritDoc}
     *
     * <p>Returns the employee's skill entries as {@link SkillStrength} (years +
     * project count), resolving {@code employeeName} via the frozen
     * {@link EmployeeContract}. An employee with no portfolio yet yields an empty
     * skills list (never null).
     */
    @Override
    @Transactional(readOnly = true)
    public PortfolioSummary portfolioFor(EmployeeId employeeId) {
        List<SkillStrength> skills = portfolioRepository.findByEmployeeId(employeeId.value())
                .map(Portfolio::getId)
                .map(skillRepository::findByPortfolioId)
                .orElseGet(List::of)
                .stream()
                .map(s -> new SkillStrength(employeeId, resolveEmployeeName(employeeId),
                        s.getSkill(), s.getYears(), s.getProjectCount()))
                .toList();
        return new PortfolioSummary(employeeId, skills);
    }

    // ---- Module read (full portfolio, for the controller) ----

    /**
     * Returns the full portfolio view for an employee. An existing employee with no
     * portfolio yields an empty view (each section empty); an unknown employee
     * (when the {@link EmployeeContract} is available and reports it absent) raises
     * {@link EmployeeNotFoundException} → 404.
     */
    @Transactional(readOnly = true)
    public PortfolioView getPortfolio(EmployeeId employeeId) {
        requireEmployeeExists(employeeId);
        return portfolioRepository.findByEmployeeId(employeeId.value())
                .map(p -> toView(employeeId, p))
                .orElseGet(() -> emptyView(employeeId));
    }

    // ---- Module writes ----

    /**
     * Replaces the whole portfolio (delete + reinsert child rows) for an existing
     * employee. Idempotent 1:1 upsert: creates the portfolio row if absent. Returns
     * the resulting view.
     */
    @Transactional
    public PortfolioView replacePortfolio(EmployeeId employeeId, PortfolioView view) {
        requireEmployeeExists(employeeId);
        Portfolio portfolio = findOrCreate(employeeId);
        replaceChildren(portfolio, view);
        portfolio.setUpdatedAt(Instant.now());
        return toView(employeeId, portfolioRepository.save(portfolio));
    }

    @Transactional
    public PortfolioView.SkillView addSkill(EmployeeId employeeId, PortfolioView.SkillView entry) {
        requireEmployeeExists(employeeId);
        validateSkill(entry);
        Portfolio portfolio = findOrCreate(employeeId);
        PortfolioSkill saved = skillRepository.save(PortfolioSkill.builder()
                .portfolioId(portfolio.getId())
                .skill(entry.skill())
                .years(entry.years())
                .projectCount(entry.projectCount())
                .build());
        return toSkillView(saved);
    }

    @Transactional
    public PortfolioView.SkillView updateSkill(EmployeeId employeeId, Long entryId, PortfolioView.SkillView entry) {
        requireEmployeeExists(employeeId);
        validateSkill(entry);
        PortfolioSkill skill = skillOf(employeeId, entryId);
        skill.setSkill(entry.skill());
        skill.setYears(entry.years());
        skill.setProjectCount(entry.projectCount());
        return toSkillView(skillRepository.save(skill));
    }

    @Transactional
    public void deleteSkill(EmployeeId employeeId, Long entryId) {
        requireEmployeeExists(employeeId);
        PortfolioSkill skill = skillOf(employeeId, entryId);
        skillRepository.delete(skill);
    }

    @Transactional
    public PortfolioView.EducationView addEducation(EmployeeId employeeId, PortfolioView.EducationView entry) {
        requireEmployeeExists(employeeId);
        validateEducation(entry);
        Portfolio portfolio = findOrCreate(employeeId);
        PortfolioEducation saved = educationRepository.save(PortfolioEducation.builder()
                .portfolioId(portfolio.getId())
                .institution(entry.institution())
                .qualification(entry.qualification())
                .startYear(entry.startYear())
                .endYear(entry.endYear())
                .build());
        return toEducationView(saved);
    }

    @Transactional
    public PortfolioView.EducationView updateEducation(EmployeeId employeeId, Long entryId, PortfolioView.EducationView entry) {
        requireEmployeeExists(employeeId);
        validateEducation(entry);
        PortfolioEducation education = educationOf(employeeId, entryId);
        education.setInstitution(entry.institution());
        education.setQualification(entry.qualification());
        education.setStartYear(entry.startYear());
        education.setEndYear(entry.endYear());
        return toEducationView(educationRepository.save(education));
    }

    @Transactional
    public void deleteEducation(EmployeeId employeeId, Long entryId) {
        requireEmployeeExists(employeeId);
        PortfolioEducation education = educationOf(employeeId, entryId);
        educationRepository.delete(education);
    }

    @Transactional
    public PortfolioView.ProjectView addProject(EmployeeId employeeId, PortfolioView.ProjectView entry) {
        requireEmployeeExists(employeeId);
        validateProject(entry);
        Portfolio portfolio = findOrCreate(employeeId);
        PortfolioProject saved = projectRepository.save(PortfolioProject.builder()
                .portfolioId(portfolio.getId())
                .name(entry.name())
                .description(entry.description())
                .startYear(entry.startYear())
                .endYear(entry.endYear())
                .build());
        return toProjectView(saved);
    }

    @Transactional
    public PortfolioView.ProjectView updateProject(EmployeeId employeeId, Long entryId, PortfolioView.ProjectView entry) {
        requireEmployeeExists(employeeId);
        validateProject(entry);
        PortfolioProject project = projectOf(employeeId, entryId);
        project.setName(entry.name());
        project.setDescription(entry.description());
        project.setStartYear(entry.startYear());
        project.setEndYear(entry.endYear());
        return toProjectView(projectRepository.save(project));
    }

    @Transactional
    public void deleteProject(EmployeeId employeeId, Long entryId) {
        requireEmployeeExists(employeeId);
        PortfolioProject project = projectOf(employeeId, entryId);
        projectRepository.delete(project);
    }

    @Transactional
    public PortfolioView.LinkView addLink(EmployeeId employeeId, PortfolioView.LinkView entry) {
        requireEmployeeExists(employeeId);
        validateLink(entry);
        Portfolio portfolio = findOrCreate(employeeId);
        PortfolioLink saved = linkRepository.save(PortfolioLink.builder()
                .portfolioId(portfolio.getId())
                .label(entry.label())
                .url(entry.url())
                .build());
        return toLinkView(saved);
    }

    @Transactional
    public PortfolioView.LinkView updateLink(EmployeeId employeeId, Long entryId, PortfolioView.LinkView entry) {
        requireEmployeeExists(employeeId);
        validateLink(entry);
        PortfolioLink link = linkOf(employeeId, entryId);
        link.setLabel(entry.label());
        link.setUrl(entry.url());
        return toLinkView(linkRepository.save(link));
    }

    @Transactional
    public void deleteLink(EmployeeId employeeId, Long entryId) {
        requireEmployeeExists(employeeId);
        PortfolioLink link = linkOf(employeeId, entryId);
        linkRepository.delete(link);
    }

    // ---- Validation ----

    private static void validateSkill(PortfolioView.SkillView entry) {
        if (entry == null || entry.skill() == null || entry.skill().isBlank()) {
            throw new IllegalArgumentException("skill is required");
        }
        if (entry.years() < 0) {
            throw new IllegalArgumentException("years must be >= 0");
        }
        if (entry.projectCount() < 0) {
            throw new IllegalArgumentException("projectCount must be >= 0");
        }
    }

    private static void validateEducation(PortfolioView.EducationView entry) {
        if (entry == null || entry.institution() == null || entry.institution().isBlank()) {
            throw new IllegalArgumentException("institution is required");
        }
    }

    private static void validateProject(PortfolioView.ProjectView entry) {
        if (entry == null || entry.name() == null || entry.name().isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
    }

    private static void validateLink(PortfolioView.LinkView entry) {
        if (entry == null || entry.url() == null || entry.url().isBlank()) {
            throw new IllegalArgumentException("url is required");
        }
    }

    // ---- Ownership-resolving helpers (404 when unknown / not owned) ----

    private PortfolioSkill skillOf(EmployeeId employeeId, Long entryId) {
        return skillRepository.findById(entryId)
                .filter(s -> owns(s.getPortfolioId(), employeeId))
                .orElseThrow(() -> new PortfolioEntryNotFoundException(entryId));
    }

    private PortfolioEducation educationOf(EmployeeId employeeId, Long entryId) {
        return educationRepository.findById(entryId)
                .filter(e -> owns(e.getPortfolioId(), employeeId))
                .orElseThrow(() -> new PortfolioEntryNotFoundException(entryId));
    }

    private PortfolioProject projectOf(EmployeeId employeeId, Long entryId) {
        return projectRepository.findById(entryId)
                .filter(p -> owns(p.getPortfolioId(), employeeId))
                .orElseThrow(() -> new PortfolioEntryNotFoundException(entryId));
    }

    private PortfolioLink linkOf(EmployeeId employeeId, Long entryId) {
        return linkRepository.findById(entryId)
                .filter(l -> owns(l.getPortfolioId(), employeeId))
                .orElseThrow(() -> new PortfolioEntryNotFoundException(entryId));
    }

    private boolean owns(Long portfolioId, EmployeeId employeeId) {
        return portfolioRepository.findById(portfolioId)
                .map(Portfolio::getEmployeeId)
                .map(eid -> eid.equals(employeeId.value()))
                .orElse(false);
    }

    // ---- Portfolio lifecycle ----

    private Portfolio findOrCreate(EmployeeId employeeId) {
        return portfolioRepository.findByEmployeeId(employeeId.value())
                .orElseGet(() -> {
                    Portfolio created = Portfolio.builder()
                            .employeeId(employeeId.value())
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    return portfolioRepository.save(created);
                });
    }

    private void replaceChildren(Portfolio portfolio, PortfolioView view) {
        Long pid = portfolio.getId();
        skillRepository.deleteByPortfolioId(pid);
        educationRepository.deleteByPortfolioId(pid);
        projectRepository.deleteByPortfolioId(pid);
        linkRepository.deleteByPortfolioId(pid);
        if (view.skills() != null) {
            view.skills().forEach(s -> {
                validateSkill(s);
                skillRepository.save(PortfolioSkill.builder()
                        .portfolioId(pid).skill(s.skill()).years(s.years()).projectCount(s.projectCount()).build());
            });
        }
        if (view.education() != null) {
            view.education().forEach(e -> {
                validateEducation(e);
                educationRepository.save(PortfolioEducation.builder()
                        .portfolioId(pid).institution(e.institution()).qualification(e.qualification())
                        .startYear(e.startYear()).endYear(e.endYear()).build());
            });
        }
        if (view.projects() != null) {
            view.projects().forEach(p -> {
                validateProject(p);
                projectRepository.save(PortfolioProject.builder()
                        .portfolioId(pid).name(p.name()).description(p.description())
                        .startYear(p.startYear()).endYear(p.endYear()).build());
            });
        }
        if (view.links() != null) {
            view.links().forEach(l -> {
                validateLink(l);
                linkRepository.save(PortfolioLink.builder()
                        .portfolioId(pid).label(l.label()).url(l.url()).build());
            });
        }
    }

    // ---- Employee existence (via frozen contract, optional until Phase 1 lands) ----

    private void requireEmployeeExists(EmployeeId employeeId) {
        EmployeeContract contract = employeeContractProvider.getIfAvailable();
        if (contract != null && !contract.exists(employeeId)) {
            throw new EmployeeNotFoundException(employeeId.value());
        }
    }

    private String resolveEmployeeName(EmployeeId employeeId) {
        EmployeeContract contract = employeeContractProvider.getIfAvailable();
        if (contract == null) {
            return "";
        }
        return contract.findById(employeeId).map(EmployeeSummary::fullName).orElse("");
    }

    // ---- Mapping ----

    private PortfolioView toView(EmployeeId employeeId, Portfolio portfolio) {
        Long pid = portfolio.getId();
        return new PortfolioView(
                employeeId.value(),
                skillRepository.findByPortfolioId(pid).stream().map(PortfolioService::toSkillView).toList(),
                educationRepository.findByPortfolioId(pid).stream().map(PortfolioService::toEducationView).toList(),
                projectRepository.findByPortfolioId(pid).stream().map(PortfolioService::toProjectView).toList(),
                linkRepository.findByPortfolioId(pid).stream().map(PortfolioService::toLinkView).toList());
    }

    private static PortfolioView emptyView(EmployeeId employeeId) {
        return new PortfolioView(employeeId.value(), List.of(), List.of(), List.of(), List.of());
    }

    private static PortfolioView.SkillView toSkillView(PortfolioSkill s) {
        return new PortfolioView.SkillView(s.getId(), s.getSkill(), s.getYears(), s.getProjectCount());
    }

    private static PortfolioView.EducationView toEducationView(PortfolioEducation e) {
        return new PortfolioView.EducationView(e.getId(), e.getInstitution(), e.getQualification(), e.getStartYear(), e.getEndYear());
    }

    private static PortfolioView.ProjectView toProjectView(PortfolioProject p) {
        return new PortfolioView.ProjectView(p.getId(), p.getName(), p.getDescription(), p.getStartYear(), p.getEndYear());
    }

    private static PortfolioView.LinkView toLinkView(PortfolioLink l) {
        return new PortfolioView.LinkView(l.getId(), l.getLabel(), l.getUrl());
    }
}