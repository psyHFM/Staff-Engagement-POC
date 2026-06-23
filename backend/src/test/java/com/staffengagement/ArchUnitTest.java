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
}