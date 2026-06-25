import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { App } from './app';
import { AUTH_STORAGE, AuthStorage } from './shared/auth/auth-storage';

describe('App', () => {
  beforeEach(async () => {
    // In-memory AuthStorage — see auth-state.spec.ts for the same pattern.
    const storage: AuthStorage = {
      read: () => null,
      write: () => {
        /* no-op */
      },
      remove: () => {
        /* no-op */
      }
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), { provide: AUTH_STORAGE, useValue: storage }]
    }).compileComponents();
  });

  it('creates the root component', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});