import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Avatar, hash, initialsOf } from './avatar';

describe('Avatar', () => {
  let fixture: ComponentFixture<Avatar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Avatar] }).compileComponents();
    fixture = TestBed.createComponent(Avatar);
  });

  const render = (name: string, size?: string): HTMLElement => {
    fixture.componentRef.setInput('name', name);
    if (size) {
      fixture.componentRef.setInput('size', size);
    }
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.avatar') as HTMLElement;
  };

  it('shows first+last initials upper-cased', () => {
    // When
    const el = render('Jane Smith');

    // Then
    expect(el.textContent?.trim()).toBe('JS');
    expect(el.getAttribute('aria-label')).toBe('Jane Smith');
  });

  it('sizes the circle from the size input', () => {
    // When
    const el = render('Jane Smith', 'lg');

    // Then
    expect(el.style.width).toBe('64px');
    expect(el.style.height).toBe('64px');
  });

  it('derives a stable colour from the same name', () => {
    // When
    const first = render('Jane Smith').style.backgroundColor;
    const secondFixture = TestBed.createComponent(Avatar);
    secondFixture.componentRef.setInput('name', 'Jane Smith');
    secondFixture.detectChanges();
    const second = (secondFixture.nativeElement.querySelector('.avatar') as HTMLElement).style.backgroundColor;

    // Then
    expect(first).toBe(second);
  });

  describe('initialsOf', () => {
    it('returns ? for empty input', () => {
      expect(initialsOf('')).toBe('?');
    });

    it('handles a single name', () => {
      expect(initialsOf('Cher')).toBe('C');
    });
  });

  describe('hash', () => {
    it('is non-negative and deterministic', () => {
      expect(hash('abc')).toBe(hash('abc'));
      expect(hash('abc')).toBeGreaterThanOrEqual(0);
    });
  });
});
