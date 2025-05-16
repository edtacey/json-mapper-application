#!/bin/bash

# Script to install Git hooks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for Git directory
if [ ! -d "$PROJECT_ROOT/.git" ]; then
  echo -e "${RED}Error: No .git directory found.${NC}"
  echo "Make sure you're in a Git repository."
  exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Install pre-commit hook
echo -e "${BLUE}Installing pre-commit hook...${NC}"
cp "$SCRIPT_DIR/pre-commit-hook.sh" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Pre-commit hook installed successfully.${NC}"
else
  echo -e "${RED}Failed to install pre-commit hook.${NC}"
  exit 1
fi

echo -e "\n${YELLOW}Note: The pre-commit hook will run tests before each commit.${NC}"
echo -e "${YELLOW}You can bypass it with git commit --no-verify if needed.${NC}"
echo -e "${GREEN}Installation complete!${NC}"