// Zoneless TestBed environment — Angular 22 ships zoneless by default
// (no zone.js dependency), matching the Signals-first constitution
// (frontend-state.yaml: Angular Signals, unidirectional data flow).
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv();