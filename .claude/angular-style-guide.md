# Angular Style Guide Best Practices

This document outlines the mandatory style and architecture guidelines for Angular development in this project, based on the official Angular Style Guide.

## 1. Naming Conventions
- **File Names**: Use kebab-case for all file names (e.g., `user-profile.component.ts`). The file name must match the internal TypeScript identifier.
- **Unit Tests**: All test files must end with `.spec.ts`.
- **Directives**: Use a prefix and camelCase for attribute names (e.g., `appHighlight`).
- **Event Handlers**: Name handlers based on the action they perform, not the event that triggers them (e.g., `saveUser()` instead of `onButtonClick()`).

## 2. Project Organization
- **Root Directory**: All UI-related code must reside in the `src` directory.
- **Bootstrapping**: The application must be bootstrapped via `main.ts`.
- **Feature-Based Structure**: Organize the project by feature areas (e.g., `features/billing/`) rather than by type of code (e.g., avoiding a global `components/` folder in favor of feature-specific component folders).
- **Single Responsibility**: Follow the "One concept per file" rule.

## 3. Architecture & Dependency Injection
- **DI Pattern**: Use the `inject()` function for dependency injection instead of constructor parameter injection.

## 4. Component and Directive Design
- **Class Structure**: Place Angular-specific properties (e.g., `@Input`, `@Output`) before methods in the class definition.
- **Template Logic**: Keep templates focused on presentation. Move complex logic into the TypeScript class.
- **Access Modifiers**: 
    - Use `protected` for members used only by the template.
    - Use `readonly` for properties initialized by Angular.
- **Bindings**: Prioritize standard `[class]` and `[style]` bindings over `NgClass` and `NgStyle`.
- **Lifecycle Hooks**:
    - Keep lifecycle methods (e.g., `ngOnInit`) simple by delegating complex logic to separate methods.
    - Always implement the corresponding lifecycle interface (e.g., `implements OnInit`).
