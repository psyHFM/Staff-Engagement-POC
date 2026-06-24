import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { InteractionPage } from './interaction-page';
import { InteractionStateService } from '../interaction-state.service';

describe('InteractionPage', () => {
  let fixture: ComponentFixture<InteractionPage>;
  let stateMock: InteractionStateService;

  const subjects = signal([
    { id: { value: 1 }, fullName: 'Admin User' },
    { id: { value: 2 }, fullName: 'Employee User' }
  ]);
  const subject = signal({ value: 1 });
  const history = signal(null);
  const created = signal(null);
  const error = signal(null);
  const isLoading = signal(false);

  beforeEach(async () => {
    stateMock = {
      loadSubjects: jest.fn(),
      selectSubject: jest.fn(),
      loadHistory: jest.fn(),
      clearTransient: jest.fn(),
      createInteraction: jest.fn(),
      defaultFacilitator: () => ({ value: 2 }),
      subjects,
      subject,
      history,
      created,
      error,
      isLoading
    } as unknown as InteractionStateService;

    await TestBed
      .configureTestingModule({
        imports: [InteractionPage],
        providers: [provideRouter([])]
      })
      .overrideComponent(InteractionPage, {
        set: { providers: [{ provide: InteractionStateService, useValue: stateMock }] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(InteractionPage);
  });

  it('loads subjects and pre-selects the first employee on init', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(stateMock.loadSubjects).toHaveBeenCalled();
    expect(stateMock.selectSubject).toHaveBeenCalledWith({ value: 1 });
    expect(stateMock.loadHistory).toHaveBeenCalled();
  });

  it('selects a new subject and reloads history when the dropdown changes', () => {
    // Given
    fixture.detectChanges();

    // When
    fixture.componentInstance.onSubjectSelected({ target: { value: '2' } } as unknown as Event);

    // Then
    expect(stateMock.selectSubject).toHaveBeenCalledWith({ value: 2 });
    expect(stateMock.loadHistory).toHaveBeenCalledTimes(2);
  });

  it('renders error and success banners from state signals', () => {
    // Given
    error.set({
      timestamp: '',
      status: 500,
      error: 'Internal Server Error',
      message: 'Something went wrong',
      path: ''
    });

    // When
    fixture.detectChanges();

    // Then
    const errorBanner = fixture.nativeElement.querySelector('.interaction-page__error');
    expect(errorBanner.textContent).toContain('Something went wrong');
  });
});
