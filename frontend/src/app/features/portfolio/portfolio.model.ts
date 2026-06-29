/**
 * Portfolio read/write model (camelCase JSON per api-standards.yaml). IDs arrive as
 * JSON numbers from the backend; like the task feature they are typed as `string` for
 * path interpolation, while quantified fields (`years`, `projectCount`, `startYear`,
 * `endYear`) are `number`.
 */
export interface SkillEntry {
  id: string;
  skill: string;
  years: number;
  projectCount: number;
}

export interface EducationEntry {
  id: string;
  institution: string;
  qualification?: string;
  startYear?: number;
  endYear?: number;
}

export interface ProjectEntry {
  id: string;
  name: string;
  description?: string;
  startYear?: number;
  endYear?: number;
}

export interface LinkEntry {
  id: string;
  label?: string;
  url: string;
}

export interface Portfolio {
  employeeId: string;
  /**
   * Email of the employee this portfolio belongs to (ATSE1-39). Optional so the
   * type stays compatible with any pre-RBAC payload that omits the field; the
   * frontend treats `undefined` as "read-only" since the owner check cannot be
   * made.
   */
  ownerEmail?: string;
  skills: SkillEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  links: LinkEntry[];
}

/** A portfolio with every section empty — used before the first load and on 404. */
export function emptyPortfolio(employeeId: string): Portfolio {
  return { employeeId, skills: [], education: [], projects: [], links: [] };
}