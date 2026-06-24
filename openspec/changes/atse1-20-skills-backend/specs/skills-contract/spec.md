## ADDED Requirements

### Requirement: EmployeeContract exposes all employees for aggregation
The system SHALL extend the frozen `EmployeeContract` with an additive method `List<EmployeeSummary> allEmployees()` that returns every employee in the system as a summary.

#### Scenario: allEmployees returns every employee
- **GIVEN** employees exist in the repository
- **WHEN** `employeeContract.allEmployees()` is called
- **THEN** it returns a list containing an `EmployeeSummary` for every employee

#### Scenario: allEmployees is empty when no employees exist
- **GIVEN** no employees exist in the repository
- **WHEN** `employeeContract.allEmployees()` is called
- **THEN** it returns an empty list

#### Scenario: allEmployees does not expose repository internals
- **WHEN** the `EmployeeContract` source and its implementation are inspected
- **THEN** the method signature is additive and no other `EmployeeContract` method is removed or renamed
