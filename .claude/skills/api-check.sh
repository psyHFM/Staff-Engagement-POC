#!/bin/bash
echo "=== API STANDARDS ==="
cat .claude/constitution/api-standards.yaml
echo "=== API STANDARDS END ==="

echo "=== API IMPLEMENTATION ==="
# Find all Controllers and DTOs
# Search for files with Controller in name or @RestController annotation
CONTROLLERS=$(grep -rl "@RestController" . --include="*.java")
DTOS=$(find . -name "*DTO.java" -o -name "*Request.java" -o -name "*Response.java")

echo "--- CONTROLLERS ---"
for file in $CONTROLLERS; do
    echo "FILE: $file"
    cat "$file"
    echo "---"
done

echo "--- DTOs ---"
for file in $DTOS; do
    echo "FILE: $file"
    cat "$file"
    echo "---"
done
echo "=== API IMPLEMENTATION END ==="

echo "=== CURRENT DIFF START ==="
git diff
echo "=== CURRENT DIFF END ==="
