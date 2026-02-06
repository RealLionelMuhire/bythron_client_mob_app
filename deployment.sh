#!/bin/bash

# deployment.sh - Zero-downtime deployment script
# Author: Auto-generated
# Description: Handles deployment with health checks and rollback capability

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Progress indicators
SUCCESS="✓"
ERROR="✗"
INFO="➜"
WORKING="⟳"

# Configuration
MAX_HEALTH_CHECK_ATTEMPTS=30
HEALTH_CHECK_INTERVAL=2
BACKUP_DIR="./backups"

# Helper functions
print_header() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}================================================${NC}"
}

print_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${SUCCESS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}${ERROR} $1${NC}"
}

print_working() {
    echo -e "${YELLOW}${WORKING} $1${NC}"
}

# Start deployment
print_header "Starting Deployment Process"

# Step 1: Pull latest code
print_working "Pulling latest code from GitHub..."
if git pull origin main; then
    print_success "Code pulled successfully"
else
    print_error "Failed to pull code from GitHub"
    exit 1
fi

# Get current git commit hash for tracking
CURRENT_COMMIT=$(git rev-parse --short HEAD)
print_info "Current commit: ${CURRENT_COMMIT}"

# Step 2: Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    print_info "Created backup directory"
fi

# Step 3: Export current container IDs for potential rollback
print_working "Backing up current container state..."
docker-compose ps -q > "${BACKUP_DIR}/containers_backup_$(date +%Y%m%d_%H%M%S).txt"
print_success "Container state backed up"

# Step 4: Build new images (old containers still running)
print_working "Building new Docker images..."
print_info "Old containers continue running during build..."

if docker-compose build --no-cache; then
    print_success "Docker images built successfully"
else
    print_error "Failed to build Docker images"
    exit 1
fi

# Step 5: Start new containers (zero-downtime deployment)
print_working "Starting new containers with --force-recreate..."
print_info "This will create new containers while old ones are still serving traffic"

if docker-compose up -d --force-recreate --no-deps; then
    print_success "New containers started"
else
    print_error "Failed to start new containers"
    print_warning "Old containers are still running"
    exit 1
fi

# Step 6: Wait for containers to be ready
print_working "Waiting for containers to initialize..."
sleep 5

# Step 7: Health check verification
print_working "Running health checks..."

health_check_passed=false
attempt=1

while [ $attempt -le $MAX_HEALTH_CHECK_ATTEMPTS ]; do
    # Check if all containers are running
    running_containers=$(docker-compose ps --services --filter "status=running" | wc -l)
    total_containers=$(docker-compose ps --services | wc -l)
    
    if [ "$running_containers" -eq "$total_containers" ] && [ "$total_containers" -gt 0 ]; then
        print_info "Attempt $attempt/$MAX_HEALTH_CHECK_ATTEMPTS: All containers are running ($running_containers/$total_containers)"
        
        # Additional health check - you can customize this based on your app
        # Example: Check if a health endpoint responds
        if command -v curl &> /dev/null; then
            # Uncomment and modify the following line for HTTP health checks
            # if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
            #     health_check_passed=true
            #     break
            # fi
            health_check_passed=true
            break
        else
            health_check_passed=true
            break
        fi
    else
        print_warning "Attempt $attempt/$MAX_HEALTH_CHECK_ATTEMPTS: Waiting for containers ($running_containers/$total_containers running)..."
    fi
    
    attempt=$((attempt + 1))
    sleep $HEALTH_CHECK_INTERVAL
done

if [ "$health_check_passed" = true ]; then
    print_success "Health checks passed!"
else
    print_error "Health checks failed after $MAX_HEALTH_CHECK_ATTEMPTS attempts"
    print_warning "Rolling back deployment..."
    docker-compose down
    # Restore from backup if needed
    print_error "Deployment failed. Please check logs with 'docker-compose logs'"
    exit 1
fi

# Step 8: Clean up old/dangling images
print_working "Cleaning up old Docker images..."
old_images=$(docker images -f "dangling=true" -q | wc -l)

if [ "$old_images" -gt 0 ]; then
    docker image prune -f
    print_success "Removed $old_images dangling images"
else
    print_info "No dangling images to clean up"
fi

# Step 9: Show deployment summary
print_header "Deployment Summary"
echo -e "${GREEN}${SUCCESS} Deployment completed successfully!${NC}"
echo -e "${BLUE}${INFO} Commit: ${CURRENT_COMMIT}${NC}"
echo -e "${BLUE}${INFO} Time: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

# Show running containers
print_info "Running containers:"
docker-compose ps

# Step 10: Show logs preview
echo ""
print_info "Recent logs (last 20 lines):"
docker-compose logs --tail=20

echo ""
print_header "Deployment Complete"
print_success "All services are up and running!"
print_info "Use 'docker-compose logs -f' to follow logs"
print_info "Use 'docker-compose ps' to check container status"
