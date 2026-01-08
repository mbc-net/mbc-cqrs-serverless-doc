#!/bin/bash

# =============================================================================
# MBC CQRS Serverless - Terminal Demo Script
# =============================================================================
#
# This script creates an animated terminal demo for the README/documentation.
#
# Prerequisites:
#   - Node.js 18+
#   - npm
#   - Docker (for local development demo)
#
# Recording Tools:
#   - asciinema: https://asciinema.org/
#   - terminalizer: https://github.com/faressoft/terminalizer
#   - vhs: https://github.com/charmbracelet/vhs (recommended)
#
# Usage with asciinema:
#   asciinema rec demo.cast -c "./terminal-demo.sh"
#
# Usage with vhs:
#   vhs demo.tape
#
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Typing simulation delay (seconds)
TYPING_DELAY=0.05
COMMAND_DELAY=1

# Function to simulate typing
type_command() {
    echo -ne "${GREEN}➜ ${NC}"
    for (( i=0; i<${#1}; i++ )); do
        echo -n "${1:$i:1}"
        sleep $TYPING_DELAY
    done
    echo ""
    sleep $COMMAND_DELAY
}

# Function to print info
print_info() {
    echo -e "${BLUE}$1${NC}"
    sleep 0.5
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    sleep 0.5
}

# Clear screen and show banner
clear
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║       MBC CQRS Serverless - Quick Start Demo                 ║${NC}"
echo -e "${YELLOW}║       Build serverless apps on AWS in minutes                ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
sleep 2

# Step 1: Install CLI
print_info "Step 1: Install the CLI globally"
type_command "npm install -g @mbc-cqrs-serverless/cli"
echo "added 1 package in 3s"
print_success "CLI installed successfully!"
echo ""
sleep 1

# Step 2: Verify installation
print_info "Step 2: Verify installation"
type_command "mbc --version"
echo "1.0.17"
echo ""
sleep 1

# Step 3: Create new project
print_info "Step 3: Create a new project"
type_command "mbc new my-saas-app"
echo ""
echo "  Creating project: my-saas-app"
echo "  ├── Setting up NestJS application..."
echo "  ├── Configuring DynamoDB tables..."
echo "  ├── Creating Prisma schema..."
echo "  ├── Setting up Docker compose..."
echo "  └── Configuring Serverless framework..."
echo ""
print_success "Project created successfully!"
echo ""
sleep 2

# Step 4: Show project structure
print_info "Step 4: Explore project structure"
type_command "cd my-saas-app && tree -L 2"
cat << 'EOF'
my-saas-app/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   └── prisma/
├── infra/
│   └── docker-compose.yml
├── prisma/
│   └── schema.prisma
├── serverless.yml
├── package.json
└── tsconfig.json

4 directories, 7 files
EOF
echo ""
sleep 2

# Step 5: Start local development
print_info "Step 5: Start local development"
type_command "npm install"
echo "added 523 packages in 12s"
echo ""

type_command "npm run offline:docker"
echo "Starting Docker services..."
echo "  ✓ DynamoDB Local running on port 8000"
echo "  ✓ Cognito Local running on port 9229"
echo "  ✓ LocalStack running on port 4566"
echo ""

type_command "npm run offline:sls"
echo ""
echo "Serverless: Starting Offline..."
echo ""
echo "   ┌─────────────────────────────────────────────────┐"
echo "   │                                                 │"
echo "   │   Offline listening on http://localhost:4000   │"
echo "   │                                                 │"
echo "   └─────────────────────────────────────────────────┘"
echo ""
print_success "API server is running!"
echo ""
sleep 2

# Step 6: Test the API
print_info "Step 6: Test the API"
type_command 'curl -X POST http://localhost:4000/api/todo \
  -H "Content-Type: application/json" \
  -d '\''{"title": "Learn MBC CQRS Serverless"}'\'''

cat << 'EOF'
{
  "pk": "TODO#tenant001",
  "sk": "TODO#1704067200000",
  "id": "TODO#tenant001#TODO#1704067200000",
  "name": "Learn MBC CQRS Serverless",
  "version": 1,
  "tenantCode": "tenant001",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "createdBy": "user@example.com"
}
EOF
echo ""
print_success "Todo created successfully!"
echo ""
sleep 2

# Summary
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                     What you get:                            ║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  ✓ CQRS pattern with event sourcing                          ║${NC}"
echo -e "${YELLOW}║  ✓ Multi-tenancy built-in                                    ║${NC}"
echo -e "${YELLOW}║  ✓ DynamoDB + RDS synchronization                            ║${NC}"
echo -e "${YELLOW}║  ✓ Complete local development environment                    ║${NC}"
echo -e "${YELLOW}║  ✓ Production-ready from day one                             ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📚 Documentation: ${BLUE}https://mbc-cqrs-serverless.mbc-net.com${NC}"
echo -e "⭐ GitHub: ${BLUE}https://github.com/mbc-net/mbc-cqrs-serverless${NC}"
echo ""
sleep 3
