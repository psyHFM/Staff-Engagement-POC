import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skills-page">
      <h1>Skills Register</h1>
      <p>Welcome to the Skills Register feature (Phase 5). This is a placeholder for the full implementation.</p>
    </div>
  `,
  styles: [`
    .skills-page { padding: 2rem; }
  `]
})
export class Skills {}
