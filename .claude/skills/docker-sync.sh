#!/bin/bash
echo "=== INFRASTRUCTURE STANDARDS ==="
# Use a grep/awk to extract orchestration from tech-stack.yaml if possible,
# but for now just noting the requirement from the constitution.
echo "Requirement: All components must be orchestratable via Docker Compose."
echo "=== INFRASTRUCTURE STANDARDS END ==="

echo "=== DOCKER COMPOSE STATUS ==="
if [ ! -f "docker-compose.yml" ] && [ ! -f "docker-compose.yaml" ]; then
    echo "❌ Error: docker-compose.yml not found in the root directory."
    exit 1
fi

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker CLI not found. Please install Docker."
    exit 1
fi

echo "Fetching service status..."
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"

echo "---"

# Check for unhealthy services
UNHEALTHY=$(docker compose ps --format json | grep -i "unhealthy" || true)
if [ -n "$UNHEALTHY" ]; then
    echo "⚠️ Warning: Some services are reported as UNHEALTHY."
    echo "$UNHEALTHY"
else
    echo "✅ All running services are healthy or in a stable state."
fi

echo "=== DOCKER SYNC OPTIONS ==="
echo "To sync your environment, you can run:"
echo "  ! docker compose up -d --build  # Rebuild and restart all services"
echo "  ! docker compose restart       # Quick restart"
echo "  ! docker compose logs -f      # Tail logs for debugging"

echo "=== CURRENT DIFF START ==="
git diff docker-compose.yml 2>/dev/null || echo "No changes to docker-compose.yml"
echo "=== CURRENT DIFF END ==="
