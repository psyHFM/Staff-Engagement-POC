import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Canonical soft-pill badge (frontend-redesign §2.2).
 *
 * <p>One component renders every badge in the app so role/level/interaction-type
 * pills share a single visual language. The display label is produced from a
 * lookup and capitalized — callers pass the raw wire value (e.g. {@code admin},
 * {@code senior}, {@code check-in}) and the badge shows "Admin" / "Senior" /
 * "Check-in". An unknown value falls back to a title-cased rendering rather than
 * showing nothing.
 *
 * <p>Label maps are intentionally duplicated here (not imported from the feature
 * modules) so the shared layer stays self-contained and never depends on a
 * feature module.
 */
type BadgeKind = 'role' | 'level' | 'interaction';

const LABELS: Record<BadgeKind, Record<string, string>> = {
  role: { employee: 'Employee', admin: 'Admin' },
  level: { junior: 'Junior', intermediate: 'Intermediate', senior: 'Senior' },
  interaction: {
    'check-in': 'Check-in',
    mentoring: 'Mentoring',
    'catch-up': 'Catch-up',
    performance: 'Performance',
    other: 'Other'
  }
};

/** Maps a value to its canonical colour modifier (see badge.scss). */
const TONE: Record<BadgeKind, Record<string, string>> = {
  role: { employee: 'indigo', admin: 'amber' },
  level: { junior: 'grey', intermediate: 'blue', senior: 'green' },
  interaction: {
    'check-in': 'indigo',
    mentoring: 'sky',
    'catch-up': 'amber',
    performance: 'violet',
    other: 'grey'
  }
};

@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge badge--{{ tone() }}">{{ label() }}</span>`,
  styleUrl: './badge.scss'
})
export class Badge {
  /** Which controlled vocabulary the value belongs to. */
  readonly kind = input.required<BadgeKind>();

  /** The raw wire value (e.g. {@code admin}, {@code senior}, {@code check-in}). */
  readonly value = input.required<string>();

  protected readonly label = computed(() => {
    const v = this.value();
    return LABELS[this.kind()]?.[v] ?? titleCase(v);
  });

  protected readonly tone = computed(() => TONE[this.kind()]?.[this.value()] ?? 'grey');
}

/** Fallback for values not in the lookup: "some-value" → "Some value". */
function titleCase(value: string): string {
  if (!value) {
    return '';
  }
  const spaced = value.replace(/[-_]/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
