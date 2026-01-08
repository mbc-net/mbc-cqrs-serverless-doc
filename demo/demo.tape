# MBC CQRS Serverless - Terminal Demo
# This file is for use with VHS (https://github.com/charmbracelet/vhs)
#
# Install VHS:
#   brew install vhs   (macOS)
#   go install github.com/charmbracelet/vhs@latest (Go)
#
# Generate GIF:
#   vhs demo.tape

# Configuration
Output demo.gif
Set FontSize 16
Set Width 900
Set Height 600
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 50ms

# Title
Hide
Type "clear"
Enter
Show
Sleep 500ms

Type "# MBC CQRS Serverless - Quick Start Demo"
Enter
Type "# Build serverless apps on AWS in minutes"
Enter
Sleep 2s

# Step 1: Install CLI
Type "# Step 1: Install the CLI"
Enter
Sleep 500ms
Type "npm install -g @mbc-cqrs-serverless/cli"
Enter
Sleep 2s
Type "# ✓ CLI installed!"
Enter
Sleep 1s

# Step 2: Create Project
Enter
Type "# Step 2: Create a new project"
Enter
Sleep 500ms
Type "mbc new my-saas-app"
Enter
Sleep 3s
Type "# ✓ Project created with NestJS, DynamoDB, Prisma config"
Enter
Sleep 1s

# Step 3: Start Development
Enter
Type "# Step 3: Start local development"
Enter
Sleep 500ms
Type "cd my-saas-app && npm install"
Enter
Sleep 2s
Type "npm run offline:docker   # Start DynamoDB, Cognito, etc."
Enter
Sleep 2s
Type "npm run offline:sls      # Start API server"
Enter
Sleep 2s
Type "# ✓ API running at http://localhost:4000"
Enter
Sleep 1s

# Step 4: Test API
Enter
Type "# Step 4: Create your first todo"
Enter
Sleep 500ms
Type@100ms 'curl -X POST http://localhost:4000/api/todo \'
Enter
Type@100ms '  -H "Content-Type: application/json" \'
Enter
Type@100ms '  -d '\''{"title": "Learn MBC CQRS Serverless"}'\'''
Enter
Sleep 2s
Type "# Response includes: pk, sk, version, tenantCode, timestamps"
Enter
Sleep 2s

# Summary
Enter
Type "# What you get out of the box:"
Enter
Type "#   ✓ CQRS + Event Sourcing"
Enter
Type "#   ✓ Multi-tenancy"
Enter
Type "#   ✓ DynamoDB → RDS sync"
Enter
Type "#   ✓ Local development"
Enter
Type "#   ✓ Production ready"
Enter
Sleep 1s
Enter
Type "# 📚 https://mbc-cqrs-serverless.mbc-net.com"
Enter
Type "# ⭐ https://github.com/mbc-net/mbc-cqrs-serverless"
Enter
Sleep 3s
