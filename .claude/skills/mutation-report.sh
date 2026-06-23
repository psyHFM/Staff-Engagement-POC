#!/bin/bash
echo "=== TESTING STRATEGY ==="
cat .claude/constitution/testing-strategy.yaml
echo "=== TESTING STRATEGY END ==="

echo "=== BACKEND MUTATION & COVERAGE (PITest / JaCoCo) ==="
if command -v mvn &> /dev/null; then
    echo "Running PITest..."
    # Common PITest goal: org.pitest:pitest-maven
    mvn pitest:mutation-coverage-analysis -DmutationCoverageThreshold=80 || echo "PITest execution finished (check logs for failures)"
else
    echo "Maven not found. Skipping PITest."
fi

echo "=== FRONTEND MUTATION & COVERAGE (Stryker / Jest) ==="
if command -v npm &> /dev/null; then
    echo "Running Stryker Mutator..."
    # Assuming stryker is configured in package.json or as a standalone tool
    npx stryker-mutator run || echo "Stryker execution finished (check logs for failures)"

    echo "Running Jest Coverage..."
    npm test -- --coverage || echo "Jest coverage execution finished"
else
    echo "npm not found. Skipping frontend tests."
fi

echo "=== CURRENT DIFF START ==="
git diff
echo "=== CURRENT DIFF END ==="
