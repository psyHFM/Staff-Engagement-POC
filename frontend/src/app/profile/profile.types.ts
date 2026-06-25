import { EmployeeResponse } from '../features/employee/employee.types';
import { InteractionSummary } from '../features/interaction/interaction.types';
import { Portfolio } from '../features/portfolio/portfolio.model';
import { Task } from '../features/task/task.model';

/**
 * Frontend mirror of the backend rounded profile read model (Phase 6).
 *
 * <p>Composes the frozen cross-module contracts: employee header, interactions,
 * tasks, portfolio, and the employee's own top skills derived from the portfolio.
 */

/** One of the employee's own top skills — derived from their portfolio. */
export interface SkillWithStrength {
  readonly skill: string;
  readonly years: number;
  readonly projectCount: number;
}

/** Rounded profile for a single employee. */
export interface PersonProfile {
  readonly employee: EmployeeResponse;
  readonly interactions: InteractionSummary[];
  readonly tasks: Task[];
  readonly portfolio: Portfolio;
  readonly topSkills: SkillWithStrength[];
}
