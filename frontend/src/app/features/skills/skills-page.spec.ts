import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiClient } from '../../shared/api/api-client';
import { SkillsPage } from './skills-page';
import { Paged, SkillStrength } from './skills.types';

describe('SkillsPage', () => {
  let fixture: ComponentFixture<SkillsPage>;
  let apiClientSpy: { get: jest.Mock };

  const strength = (overrides: Partial<SkillStrength> = {}): SkillStrength => ({
    employeeId: { value: 2 },
    employeeName: 'Employee Two',
    skill: 'Angular',
    years: 4,
    projectCount: 2,
    ...overrides
  });

  const page = (overrides: Partial<Paged<SkillStrength>> = {}): Paged<SkillStrength> => ({
    content: [strength()],
    offset: 0,
    limit: 20,
    total: 1,
    ...overrides
  });

  beforeEach(() => {
    apiClientSpy = { get: jest.fn() };
    apiClientSpy.get.mockReturnValue(of(page()));

    TestBed.configureTestingModule({
      imports: [SkillsPage],
      providers: [
        { provide: ApiClient, useValue: apiClientSpy as unknown as ApiClient }
      ]
    });

    fixture = TestBed.createComponent(SkillsPage);
  });

  it('renders the search input and empty state by default', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('input[aria-label="Skill search"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.skills-results')).toBeFalsy();
  });

  it('calls the API and displays ranked results when the user types a skill name', () => {
    // Given
    const expected = page();
    apiClientSpy.get.mockReturnValue(of(expected));

    // When
    fixture.componentInstance.onInput('Angular');
    fixture.detectChanges();

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills', { name: 'Angular' });
    const cards = fixture.nativeElement.querySelectorAll('.skill-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Employee Two');
    expect(cards[0].textContent).toContain('4');
    expect(cards[0].textContent).toContain('2');
  });

  it('shows a loading indicator while the search is in flight', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));

    // When
    fixture.componentInstance.onInput('Angular');

    // Then
    expect(fixture.componentInstance.state.isLoading()).toBe(false);
  });

  it('shows an empty message when no results are returned', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of({ content: [], offset: 0, limit: 20, total: 0 }));

    // When
    fixture.componentInstance.onInput('Rust');
    fixture.detectChanges();

    // Then
    const empty = fixture.nativeElement.querySelector('.empty-state');
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain('No one found');
  });

  it('clear button resets the input and state', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));
    fixture.componentInstance.onInput('Angular');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.skill-card').length).toBe(1);

    // When
    fixture.componentInstance.clear();
    fixture.detectChanges();

    // Then
    expect(fixture.componentInstance.searchTerm()).toBe('');
    expect(fixture.nativeElement.querySelector('.skills-results')).toBeFalsy();
  });

  it('does not call the API for blank input', () => {
    // When
    fixture.componentInstance.onInput('Angular');
    fixture.componentInstance.onInput('');

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledTimes(1);
  });
});
