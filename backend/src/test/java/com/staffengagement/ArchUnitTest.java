package com.staffengagement;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Phase 0 ArchUnit baseline (ROADMAP §3 / backend-architecture.yaml v1.1.0).
 *
 * <p>Enforces the modular-monolith boundaries: the {@code controller -> service ->
 * repository} layering (controllers never touch repositories), the {@code shared}
 * foundation never depending on module internals, the frozen contracts being
 * interfaces, and no cyclic module dependencies. Per-module isolation rules
 * (no cross-module {@code repository/} or {@code domain/} imports) activate as
 * domain modules land in Phases 1-5.
 */
@AnalyzeClasses(packages = "com.staffengagement")
class ArchUnitTest {

    @ArchTest
    static final ArchRule controllersMustNotDependOnRepositories =
            noClasses().that().resideInAPackage("..controller..")
                    .should().dependOnClassesThat().resideInAPackage("..repository..")
                    .because("controllers go through the service layer, never repositories directly");

    @ArchTest
    static final ArchRule sharedMustNotDependOnModuleRepositoryOrDomain =
            noClasses().that().resideInAPackage("com.staffengagement.shared..")
                    .should().dependOnClassesThat().resideInAnyPackage("..repository..", "..domain..")
                    .because("the shared foundation must not depend on any module's internals");

    @ArchTest
    static final ArchRule frozenContractsAreInterfaces =
            classes().that().resideInAPackage("com.staffengagement.shared.api..")
                    .and().haveSimpleNameEndingWith("Contract")
                    .should().beInterfaces()
                    .because("cross-module ports are Service interfaces, not implementations");

    @ArchTest
    static void noCyclicModuleDependencies(JavaClasses classes) {
        SlicesRuleDefinition.slices()
                .matching("com.staffengagement.(*)..")
                .should().beFreeOfCycles()
                .check(classes);
    }

    /**
     * Phase 3 task-module isolation (ROADMAP §3 / backend-architecture.yaml).
     *
     * <p>The task module must never reach into another module's internals (the employee,
     * interaction, portfolio and skills {@code domain}/{@code repository}/{@code service}
     * packages) nor into the shared foundation's internal packages
     * ({@code shared.security}, {@code shared.health}, {@code shared.error}). Cross-module
     * communication is exclusively via the frozen {@code shared.api} contracts and
     * {@code shared.kernel} ids. The denylist below is the active guard — a denylist is
     * used (rather than an allowlist) so the rule only evaluates {@code com.staffengagement}
     * references and is not thrown off by JDK classes ArchUnit cannot fully resolve.
     */
    @ArchTest
    static final ArchRule taskModuleMustNotDependOnOtherModulesInternals =
            noClasses().that().resideInAPackage("com.staffengagement.task..")
                    .should().dependOnClassesThat().resideInAnyPackage(
                            "com.staffengagement.shared.error..",
                            "com.staffengagement.shared.health..",
                            "com.staffengagement.shared.security..",
                            "com.staffengagement.employee..",
                            "com.staffengagement.interaction..",
                            "com.staffengagement.portfolio..",
                            "com.staffengagement.skills..")
                    .because("the task module talks to other modules only via frozen shared.api contracts and shared.kernel ids, never their internals");

    /**
     * Phase 4 portfolio-module isolation (ROADMAP §3 / backend-architecture.yaml).
     *
     * <p>The portfolio module must never reach into another module's internals (the
     * employee, interaction, task and skills {@code domain}/{@code repository}/{@code service}
     * packages) nor into the shared foundation's internal packages
     * ({@code shared.security}, {@code shared.health}). Cross-module communication is
     * exclusively via the frozen {@code shared.api} contracts, {@code shared.kernel}
     * ids, and the {@code shared.error} {@code ErrorEnvelope} (the uniform error contract
     * from {@code api-standards.yaml}, used by the module's local error handler). As with
     * the task rule, a denylist is used (per the build-env note) so ArchUnit is not
     * thrown off by JDK classes it cannot fully resolve.
     */
    @ArchTest
    static final ArchRule portfolioModuleMustNotDependOnOtherModulesInternals =
            noClasses().that().resideInAPackage("com.staffengagement.portfolio..")
                    .should().dependOnClassesThat().resideInAnyPackage(
                            "com.staffengagement.shared.security..",
                            "com.staffengagement.shared.health..",
                            "com.staffengagement.employee..",
                            "com.staffengagement.interaction..",
                            "com.staffengagement.task..",
                            "com.staffengagement.skills..")
                    .because("the portfolio module talks to other modules only via frozen shared.api contracts and shared.kernel ids, and uses shared.error only via the uniform ErrorEnvelope; it never reaches another module's internals");
}