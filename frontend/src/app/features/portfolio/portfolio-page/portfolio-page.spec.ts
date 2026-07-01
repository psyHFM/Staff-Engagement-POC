import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { PortfolioPage } from './portfolio-page';
import { PortfolioStateService } from '../portfolio-state.service';
import { AuthState } from '../../../shared/auth/auth-state';
import { Portfolio } from '../portfolio.model';

describe('PortfolioPage', () => {
  let fixture: ComponentFixture<PortfolioPage>;

  let fakeState: {
    portfolio: ReturnType<typeof signal<Portfolio | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    loadPortfolio: jest.Mock;
  };

  let fakeAuth: {
    currentUser: ReturnType<typeof signal<string | null>>;
    currentUserSubject: ReturnType<typeof signal<string | null>>;
    currentEmployeeId: ReturnType<typeof signal<number | null>>;
    bearerToken: ReturnType<typeof signal<string | null>>;
  };

  const portfolio = (): Portfolio => ({
    employeeId: '5',
    ownerEmail: 'jane@staff.eng',
    skills: [{ id: 's1', skill: 'Angular', years: 4, projectCount: 3 }],
    education: [],
    projects: [],
    links: []
  });

  beforeEach(async () => {
    fakeState = {
      portfolio: signal<Portfolio | null>(null),
      loading: signal(false),
      loadPortfolio: jest.fn()
    };

    fakeAuth = {
      currentUser: signal<string | null>('jane@staff.eng'),
      currentUserSubject: signal<string | null>('jane@staff.eng'),
      currentEmployeeId: signal<number | null>(5),
      bearerToken: signal<string | null>(null)
    };

    await TestBed.configureTestingModule({
      imports: [PortfolioPage],
      providers: [
        provideRouter([]),
        { provide: PortfolioStateService, useValue: fakeState },
        { provide: AuthState, useValue: fakeAuth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioPage);
  });

  it('loads the current user portfolio on init', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(fakeState.loadPortfolio).toHaveBeenCalledWith('5');
  });

  it('renders the portfolio editor for the current user', () => {
    // Given
    fakeState.portfolio.set(portfolio());

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('app-portfolio-editor')).toBeTruthy();
    expect(fixture.componentInstance.employeeId()).toBe('5');
  });

  it('shows a fallback when no current employee id is available', () => {
    // Given
    fakeAuth.currentEmployeeId.set(null);

    // When
    fixture.detectChanges();

    // Then
    expect(fakeState.loadPortfolio).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-portfolio-editor')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('Profile not linked');
  });

  it('does not render a search bar or employee picker', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('app-employee-picker')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('select')).toBeFalsy();
  });
});
