import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Coloured-initials avatar (frontend-redesign §2.2).
 *
 * <p>Renders a circle with the person's initials on a background colour
 * deterministically hashed from their name, so the same name always yields the
 * same colour across the app. No photo upload is supported. Sizes: {@code sm}
 * (28px) and {@code md} (32px) for bars/lists, {@code lg} (64px) for the profile
 * header.
 */
type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<AvatarSize, number> = { sm: 28, md: 32, lg: 64 };

/** Stable palette; the name hash picks an index. */
const PALETTE = [
  '#4f46e5', '#0369a1', '#92400e', '#6d28d9', '#16a34a', '#b91c1c', '#0f766e', '#a16207'
];

@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="avatar"
      role="img"
      [attr.aria-label]="name()"
      [style.width.px]="px()"
      [style.height.px]="px()"
      [style.fontSize.px]="fontPx()"
      [style.backgroundColor]="colour()"
    >{{ initials() }}</span>
  `,
  styleUrl: './avatar.scss'
})
export class Avatar {
  /** The person's full name. */
  readonly name = input.required<string>();

  /** Rendered size. Defaults to {@code md}. */
  readonly size = input<AvatarSize>('md');

  protected readonly px = computed(() => SIZE_PX[this.size()]);
  protected readonly fontPx = computed(() => Math.round(this.px() * 0.4));

  protected readonly initials = computed(() => initialsOf(this.name()));
  protected readonly colour = computed(() => PALETTE[hash(this.name()) % PALETTE.length]);
}

/** First letters of the first and last name parts, upper-cased (max 2). */
export function initialsOf(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Deterministic non-negative hash of a string (djb2). */
export function hash(value: string): number {
  let h = 5381;
  for (let i = 0; i < (value ?? '').length; i++) {
    h = (h * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(h);
}
