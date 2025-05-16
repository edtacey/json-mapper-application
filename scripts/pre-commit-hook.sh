#!/bin/bash

# Pre-commit hook to run tests before allowing a commit
# Copy this file to .git/hooks/pre-commit to enable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FEATURES_TEST_SCRIPT="$PROJECT_ROOT/scripts/test-schema-features.js"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
check_server() {
  curl -s "http://localhost:3000/api/health" > /dev/null
  return $?
}

# Print header
echo -e "\n${BLUE}Running pre-commit tests...${NC}\n"

# Stage 1: Basic syntax checking
echo -e "${YELLOW}Stage 1: Syntax checking${NC}"

# TypeScript type checking
echo -e "Running TypeScript type checking..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo -e "${RED}TypeScript type check failed!${NC}"
  echo -e "${YELLOW}Fix the type errors before committing.${NC}"
  exit 1
fi
echo -e "${GREEN}TypeScript type check passed.${NC}"

# ESLint
if [ -f "$PROJECT_ROOT/.eslintrc.js" ]; then
  echo -e "Running ESLint..."
  npx eslint src/ --max-warnings=0
  if [ $? -ne 0 ]; then
    echo -e "${RED}ESLint check failed!${NC}"
    echo -e "${YELLOW}Fix the linting errors before committing.${NC}"
    exit 1
  fi
  echo -e "${GREEN}ESLint check passed.${NC}"
fi

# Stage 2: Unit tests
echo -e "\n${YELLOW}Stage 2: Unit tests${NC}"
echo -e "Running unit tests..."
npm test -- --silent
if [ $? -ne 0 ]; then
  echo -e "${RED}Unit tests failed!${NC}"
  echo -e "${YELLOW}Fix the failing tests before committing.${NC}"
  exit 1
fi
echo -e "${GREEN}Unit tests passed.${NC}"

# Stage 3: Schema features test (if server is running)
echo -e "\n${YELLOW}Stage 3: Schema features test${NC}"

if check_server; then
  echo -e "Backend server is running, executing schema features test..."
  node "$FEATURES_TEST_SCRIPT"
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Schema features test failed!${NC}"
    echo -e "${YELLOW}Fix the feature test issues before committing.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Schema features test passed.${NC}"
else
  echo -e "${YELLOW}Backend server is not running, skipping schema features test.${NC}"
  echo -e "${YELLOW}Consider running a full test suite manually before pushing.${NC}"
fi

# All tests passed
echo -e "\n${GREEN}All pre-commit tests passed!${NC}"
echo -e "${GREEN}Proceeding with commit...${NC}\n"
exit 0