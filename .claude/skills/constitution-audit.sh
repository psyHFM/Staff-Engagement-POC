#!/bin/bash
echo "=== CONSTITUTION START ==="
for file in .claude/constitution/*.yaml; do
    echo "FILE: $file"
    cat "$file"
    echo "---"
done
echo "=== CONSTITUTION END ==="

echo "=== CURRENT DIFF START ==="
git diff
echo "=== CURRENT DIFF END ==="
