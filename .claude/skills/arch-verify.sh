#!/bin/bash
echo "=== BACKEND ARCHITECTURE STANDARDS ==="
cat .claude/constitution/backend-architecture.yaml
echo "=== ARCHITECTURE STANDARDS END ==="

echo "=== RUNNING ARCHUNIT TESTS ==="
# Try to run tests matching ArchitectureTest or ArchUnit patterns
# Using mvn test -Dtest=... if maven is available
if command -v mvn &> /dev/null; then
    echo "Detected Maven. Attempting to run Architecture tests..."
    mvn test -Dtest="*ArchitectureTest*"
else
    echo "Maven not found in path. Please ensure Maven is installed to run ArchUnit tests."
fi

echo "=== ARCHITECTURE SCAN ==="
# Simple static scan for common violations if tests are not yet implemented
echo "Scanning for potential Layer violations (Repository in Web layer)..."
# Find files in 'web' or 'controller' packages that import 'repository'
grep -rl "repository" . --include="*.java" | grep "controller" || echo "No obvious Web -> Repository violations found."

echo "Scanning for Circular Dependencies (Basic check)..."
# This is hard via bash, so we rely on ArchUnit.
echo "Please refer to ArchUnit test results for circular dependency checks."
echo "=== ARCHITECTURE SCAN END ==="

echo "=== CURRENT DIFF START ==="
git diff
echo "=== CURRENT DIFF END ==="
