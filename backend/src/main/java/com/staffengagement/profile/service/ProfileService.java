package com.staffengagement.profile.service;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.InteractionContract;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.api.PortfolioContract;
import com.staffengagement.shared.api.PortfolioSummary;
import com.staffengagement.shared.api.TaskContract;
import com.staffengagement.shared.api.TaskSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only orchestration service for the rounded employee profile.
 *
 * <p>Composes data from four frozen contracts only: {@link EmployeeContract},
 * {@link InteractionContract}, {@link TaskContract}, and {@link PortfolioContract}.
 * No module internals or repositories are accessed directly. The method is wrapped in
 * a single read-only transaction as permitted by {@code backend-architecture.yaml}.
 */
@Service
public class ProfileService {

    private final EmployeeContract employeeContract;
    private final InteractionContract interactionContract;
    private final TaskContract taskContract;
    private final PortfolioContract portfolioContract;

    public ProfileService(
            EmployeeContract employeeContract,
            InteractionContract interactionContract,
            TaskContract taskContract,
            PortfolioContract portfolioContract) {
        this.employeeContract = employeeContract;
        this.interactionContract = interactionContract;
        this.taskContract = taskContract;
        this.portfolioContract = portfolioContract;
    }

    @Transactional(readOnly = true)
    public PersonProfile profileFor(EmployeeId id) {
        EmployeeSummary employee = employeeContract.findById(id)
                .orElseThrow(() -> new ProfileNotFoundException(id));

        List<InteractionSummary> interactions = interactionContract.findBySubject(id);
        List<TaskSummary> tasks = taskContract.tasksForEmployee(id);
        PortfolioSummary portfolio = portfolioContract.portfolioFor(id);

        return ProfileMapper.assemble(employee, interactions, tasks, portfolio);
    }
}
