import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Badge } from './badge';

describe('Badge', () => {
  let fixture: ComponentFixture<Badge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Badge] }).compileComponents();
    fixture = TestBed.createComponent(Badge);
  });

  const render = (kind: string, value: string): HTMLElement => {
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.badge') as HTMLElement;
  };

  it('renders a capitalized role label, never the raw wire value', () => {
    // When
    const el = render('role', 'admin');

    // Then
    expect(el.textContent?.trim()).toBe('Admin');
    expect(el.textContent?.trim()).not.toBe('admin');
  });

  it('maps level values to their canonical labels and tones', () => {
    // When
    const el = render('level', 'senior');

    // Then
    expect(el.textContent?.trim()).toBe('Senior');
    expect(el.classList).toContain('badge--green');
  });

  it('colour-codes each interaction type', () => {
    // When / Then
    expect(render('interaction', 'check-in').classList).toContain('badge--indigo');
    expect(render('interaction', 'mentoring').classList).toContain('badge--sky');
    expect(render('interaction', 'performance').classList).toContain('badge--violet');
  });

  it('title-cases an unknown value instead of showing nothing', () => {
    // When
    const el = render('role', 'some-future-role');

    // Then
    expect(el.textContent?.trim()).toBe('Some future role');
    expect(el.classList).toContain('badge--grey');
  });
});
