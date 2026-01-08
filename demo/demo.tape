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

# Setup - Hide personal info from prompt and change to /tmp
Hide
Type "cd /tmp && rm -rf my-saas-app"
Enter
Type "export PS1='$ '"
Enter
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
Sleep 1s
Enter
Hide
Sleep 500ms
Type "clear"
Enter
Show
Type "# ✓ CLI installed!"
Enter
Sleep 1s

# Step 2: Create Project
Enter
Type "# Step 2: Create a new project"
Enter
Sleep 500ms
Type "mbc new my-saas-app"
Sleep 1s
Enter
Hide
Sleep 500ms
Type "clear"
Enter
Show
Type "# ✓ Project created with NestJS, DynamoDB, Prisma config"
Enter
Sleep 1s

# Step 3: Start Development
Enter
Type "# Step 3: Start local development"
Enter
Sleep 500ms
Type "cd my-saas-app && npm install"
Sleep 1s
Enter
Hide
Sleep 500ms
Type "clear"
Enter
Show
Type "npm run offline:docker   # Start DynamoDB, Cognito, etc."
Sleep 1s
Enter
Hide
Sleep 500ms
Type "clear"
Enter
Show
Type "npm run migrate          # Run database migrations"
Sleep 1s
Enter
Hide
Sleep 500ms
Type "clear"
Enter
Show
Type "npm run offline:sls      # Start API server"
Sleep 1s
Enter
Hide
Sleep 500ms
Type "clear"
Enter
Show
Type "# ✓ API running at http://localhost:4000"
Enter
Sleep 1s

# Step 4: Test API
Enter
Type "# Step 4: Test the API"
Enter
Sleep 500ms
Type "# POST /api/todo with JSON body"
Enter
Sleep 1s
Type "# Returns: pk, sk, version, tenantCode, timestamps"
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
