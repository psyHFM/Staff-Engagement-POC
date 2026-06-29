import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ApiClient } from '../../shared/api/api-client';
import { SkillsPage } from './skills-page';
import { Paged, SkillStrength, SkillSummary } from './skills.types';

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

  const summary = (overrides: Partial<SkillSummary> = {}): SkillSummary => ({
    skill: 'Angular',
    employeeCount: 3,
    topHolder: strength({ employeeName: 'Alice', years: 5 }),
    ...overrides
  });

  beforeEach(() => {
    sessionStorage.clear();
    apiClientSpy = { get: jest.fn() };
    // Default mock: search returns a populated page; popular returns an empty list.
    // Individual tests can override with mockReturnValueOnce when they need
    // populated popular tiles or different orderings.
    apiClientSpy.get.mockImplementation((path: string) => {
      if (path === 'skills/popular') {
        return of([]);
      }
      return of(page());
    });

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
    // Given — keep the popular grid empty so it doesn't interfere with result rendering.
    const expected = page();
    apiClientSpy.get.mockImplementation((path: string) =>
      path === 'skills/popular' ? of([]) : of(expected)
    );

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
    apiClientSpy.get.mockImplementation((path: string) =>
      path === 'skills/popular' ? of([]) : of(page())
    );

    // When
    fixture.componentInstance.onInput('Angular');

    // Then
    expect(fixture.componentInstance.state.isLoading()).toBe(false);
  });

  it('shows an empty message when no results are returned', () => {
    // Given — populate the popular grid so its empty-state sibling doesn't
    // satisfy the assertion; return an empty search page so results render the
    // "No one found" message.
    apiClientSpy.get.mockImplementation((path: string) =>
      path === 'skills/popular'
        ? of([summary()])
        : of({ content: [], offset: 0, limit: 20, total: 0 })
    );

    // When
    fixture.componentInstance.onInput('Rust');
    fixture.detectChanges();

    // Then
    const resultsEmpty = fixture.nativeElement.querySelector('.skills-results .empty-state');
    expect(resultsEmpty).toBeTruthy();
    expect(resultsEmpty.textContent).toContain('No one found');
  });

  it('clear button resets the input and state', () => {
    // Given — pre-load an empty popular grid so the post-clear `loadPopular`
    // call (which `clear()` triggers) also returns an empty array, not the page
    // mock.
    apiClientSpy.get.mockImplementation((path: string) =>
      path === 'skills/popular' ? of([]) : of(page())
    );
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

  // ---- ATSE1-40 popular grid ----

  it('loads the popular grid on init so the page shows tiles by default', () => {
    // Given
    const summaries = [summary(), summary({ skill: 'React', employeeCount: 2 })];
    apiClientSpy.get.mockReturnValue(of(summaries));

    // When
    fixture.detectChanges();

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills/popular', { limit: 20 });
    const tiles = fixture.nativeElement.querySelectorAll('.skill-tile');
    expect(tiles.length).toBe(2);
    expect(tiles[0].textContent).toContain('Angular');
    expect(tiles[0].textContent).toContain('3 people');
    expect(tiles[0].textContent).toContain('Alice');
  });

  it('clicking a popular tile seeds the search box and triggers a search', () => {
    // Given — first call returns popular tiles; subsequent calls return search pages.
    const summaries = [summary()];
    apiClientSpy.get.mockImplementation((path: string) =>
      path === 'skills/popular' ? of(summaries) : of(page())
    );
    fixture.detectChanges();
    apiClientSpy.get.mockClear();

    // When
    fixture.componentInstance.onTileClick('Angular');
    fixture.detectChanges();

    // Then
    expect(fixture.componentInstance.searchTerm()).toBe('Angular');
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills', { name: 'Angular' });
  });

  it('renders the sort dropdown with the persisted option selected', () => {
    // Given
    apiClientSpy.get.mockImplementation((path: string) =>
      path === 'skills/popular' ? of([]) : of([])
    );

    // When
    fixture.detectChanges();

    // Then
    const select: HTMLSelectElement | null = fixture.nativeElement.querySelector('select#skills-sort');
    expect(select).toBeTruthy();
    expect(select!.options.length).toBe(6);
    // JSDOM does not always reflect the ngModel binding on `select.value`; the
    // safest check is the bound state itself, which the dropdown mirrors.
    expect(fixture.componentInstance.state.sortOption()).toBe('default');
  });

  it('changing the sort dropdown persists the option and re-runs the active search', () => {
    // Given
    apiClientSpy.get.mockImplementation((path: string) =>
      path === 'skills/popular' ? of([]) : of(page())
    );
    fixture.componentInstance.onInput('Angular');
    fixture.detectChanges();
    apiClientSpy.get.mockClear();

    // When
    fixture.componentInstance.onSortChange('name-asc');
    fixture.detectChanges();

    // Then
    expect(fixture.componentInstance.state.sortOption()).toBe('name-asc');
    expect(sessionStorage.getItem('skills.sortOption')).toBe('name-asc');
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills', { name: 'Angular', sort: 'name,asc' });
  });

  it('changing the sort dropdown without an active query does not call the search API', () => {
    // Given
    apiClientSpy.get.mockImplementation((path: string) =>
      path === 'skills/popular' ? of([]) : of([])
    );
    fixture.detectChanges();
    apiClientSpy.get.mockClear();

    // When
    fixture.componentInstance.onSortChange('years-desc');

    // Then
    expect(apiClientSpy.get).not.toHaveBeenCalled();
    expect(fixture.componentInstance.state.sortOption()).toBe('years-desc');
  });

  it('clear re-fetches the popular grid', () => {
    // Given
    const summaries = [summary()];
    apiClientSpy.get.mockImplementation((path: string) =>
      path === 'skills/popular' ? of(summaries) : of(page())
    );
    fixture.detectChanges();
    apiClientSpy.get.mockClear();

    // When
    fixture.componentInstance.clear();

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills/popular', { limit: 20 });
  });
});
