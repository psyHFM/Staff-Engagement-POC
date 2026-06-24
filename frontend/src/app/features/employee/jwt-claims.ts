/**
 * In-feature JWT role decoder — the RBAC affordance for the Employee detail
 * (frontend-state.yaml: UI state derives from Signals; the backend enforces RBAC).
 *
 * <p>The current user's role is needed to gate the detail edit + role controls
 * (an ADMIN edits any record and may change role; a non-admin edits only their
 * own record and cannot change role). {@link AuthState} (in {@code shared/auth},
 * which is frozen per ROADMAP §2.2) exposes only the username/email, not the role,
 * so the employee feature decodes the role from the JWT {@code roles} claim itself.
 *
 * <p>The backend {@code JwtTokenProvider} stores the claim as the enum-NAME list
 * (e.g. {@code ["ADMIN"]}) — the authority becomes {@code ROLE_ADMIN}. The
 * {@link EmployeeResponse#role} field, by contrast, uses the lowercase JSON form
 * (e.g. {@code admin}); this helper intentionally compares against the NAME form
 * because it reads the token, not the response.
 *
 * <p>This is a best-effort UX affordance only. The backend enforces RBAC
 * regardless (403 on a non-admin role change or a non-owner update), so a wrong
 * guess here simply surfaces a 403 envelope on submit. A malformed or missing
 * token yields an empty role list → treated as a non-admin.
 */

/** The role names carried by the JWT {@code roles} claim (e.g. {@code ["ADMIN"]}); empty on any failure. */
export function decodeRoles(token: string | null): readonly string[] {
  if (!token) {
    return [];
  }
  const parts = token.split('.');
  if (parts.length < 2) {
    return [];
  }
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { roles?: unknown };
    const roles = payload?.roles;
    return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
  } catch {
    return [];
  }
}

/** True when the JWT {@code roles} claim includes {@code ADMIN} (NAME form). */
export function isAdminToken(token: string | null): boolean {
  return decodeRoles(token).includes('ADMIN');
}

/** Base64url → UTF-8 string, tolerant of missing padding (browser {@code atob} is base64, not base64url). */
function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}