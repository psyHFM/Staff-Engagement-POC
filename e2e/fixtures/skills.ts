import { APIRequestContext } from '@playwright/test';

export interface SkillSeed {
  readonly employeeId: number;
  readonly skill: string;
  readonly years: number;
  readonly projectCount: number;
}

/**
 * Upsert a portfolio for the seeded admin employee with the requested skill.
 * Requires an authenticated API request context.
 */
export async function seedSkill(
  ctx: APIRequestContext,
  token: string,
  { employeeId, skill, years, projectCount }: SkillSeed
): Promise<void> {
  const res = await ctx.put(`/api/v1/employees/${employeeId}/portfolio`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      employeeId,
      skills: [{ skill, years, projectCount }],
      education: [],
      projects: [],
      links: []
    }
  });

  if (!res.ok()) {
    throw new Error(`Failed to seed skill: ${res.status()} ${await res.text()}`);
  }
}
