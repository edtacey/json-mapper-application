#!/bin/bash

# Regression Test Runner for JSON Mapper
# This script runs all tests including unit tests and feature tests
# and provides a comprehensive summary of results
#
# Usage: ./run-regression-tests.sh [--ci] [--skip-backend] [--skip-frontend]
#   --ci: Run in CI mode (non-interactive)
#   --skip-backend: Skip backend tests
#   --skip-frontend: Skip frontend tests

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
BACKEND_PORT=3000
LOG_FILE="$TEST_RESULTS_DIR/regression-tests.log"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Command line arguments
CI_MODE=false
SKIP_BACKEND=false
SKIP_FRONTEND=false

for arg in "$@"; do
  case $arg in
    --ci)
      CI_MODE=true
      ;;
    --skip-backend)
      SKIP_BACKEND=true
      ;;
    --skip-frontend)
      SKIP_FRONTEND=true
      ;;
  esac
done

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

# Initialize log file
echo "JSON Mapper Regression Test Run - $(date)" > "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

# Utility functions
log() {
  echo -e "${BLUE}[INFO]${NC} $1"
  echo "[INFO] $1" >> "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
  echo "[SUCCESS] $1" >> "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
  echo "[WARNING] $1" >> "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
  echo "[ERROR] $1" >> "$LOG_FILE"
}

# Run a test and track results
run_test() {
  local test_name="$1"
  local test_command="$2"
  local result_file="$TEST_RESULTS_DIR/${test_name// /_}.result"
  
  log "Running test: $test_name"
  echo "$ $test_command" >> "$LOG_FILE"
  
  if $CI_MODE; then
    # In CI mode, run quietly
    eval "$test_command" > "$result_file" 2>&1
  else
    # Interactive mode, show output
    eval "$test_command" | tee "$result_file"
  fi
  
  local test_result=$?
  
  if [ $test_result -eq 0 ]; then
    log_success "Test '$test_name' passed"
    return 0
  else
    log_error "Test '$test_name' failed with exit code $test_result"
    return 1
  fi
}

# Check if backend server is running
check_server() {
  curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null
  if [ $? -eq 0 ]; then
    log "Backend server is running"
    return 0
  else
    log_error "Backend server is not running on port $BACKEND_PORT"
    return 1
  fi
}

# Start backend server if needed
ensure_server_running() {
  if ! check_server; then
    log "Starting backend server..."
    cd "$PROJECT_ROOT" && \
    nohup npm run dev:backend > "$TEST_RESULTS_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    log "Server started with PID $SERVER_PID"
    
    # Wait for server to start
    for i in {1..30}; do
      if check_server; then
        log "Server is ready"
        return 0
      fi
      sleep 1
    done
    
    log_error "Server failed to start within 30 seconds"
    return 1
  fi
}

# Initialize test tracker
total_tests=0
passed_tests=0
failed_tests=0

# Print header
echo -e "\n${BLUE}=================================${NC}"
echo -e "${BLUE}JSON Mapper Regression Test Suite${NC}"
echo -e "${BLUE}=================================${NC}\n"

# TypeScript type checking
if ! $SKIP_BACKEND; then
  run_test "TypeScript Backend Type Check" "cd $PROJECT_ROOT && npx tsc --noEmit"
  if [ $? -eq 0 ]; then
    ((passed_tests++))
  else
    ((failed_tests++))
  fi
  ((total_tests++))
fi

if ! $SKIP_FRONTEND; then
  run_test "TypeScript Frontend Type Check" "cd $PROJECT_ROOT/frontend && npx tsc --noEmit"
  if [ $? -eq 0 ]; then
    ((passed_tests++))
  else
    ((failed_tests++))
  fi
  ((total_tests++))
fi

# ESLint
if ! $SKIP_BACKEND; then
  if [ -f "$PROJECT_ROOT/.eslintrc.js" ]; then
    run_test "Backend ESLint" "cd $PROJECT_ROOT && npx eslint src/ --max-warnings=0"
    if [ $? -eq 0 ]; then
      ((passed_tests++))
    else
      ((failed_tests++))
    fi
    ((total_tests++))
  else
    log_warning "ESLint config not found, skipping backend linting"
  fi
fi

if ! $SKIP_FRONTEND; then
  if [ -f "$PROJECT_ROOT/frontend/.eslintrc.js" ] || [ -f "$PROJECT_ROOT/.eslintrc.js" ]; then
    run_test "Frontend ESLint" "cd $PROJECT_ROOT && npx eslint frontend/src/ --max-warnings=0"
    if [ $? -eq 0 ]; then
      ((passed_tests++))
    else
      ((failed_tests++))
    fi
    ((total_tests++))
  else
    log_warning "ESLint config not found, skipping frontend linting"
  fi
fi

# Unit tests
if ! $SKIP_BACKEND; then
  run_test "Backend Unit Tests" "cd $PROJECT_ROOT && npm test"
  if [ $? -eq 0 ]; then
    ((passed_tests++))
  else
    ((failed_tests++))
  fi
  ((total_tests++))
fi

if ! $SKIP_FRONTEND; then
  run_test "Frontend Unit Tests" "cd $PROJECT_ROOT/frontend && npm test"
  if [ $? -eq 0 ]; then
    ((passed_tests++))
  else
    ((failed_tests++))
  fi
  ((total_tests++))
fi

# Make test scripts executable
chmod +x "$SCRIPT_DIR/test-schema-features.js"

# Integration tests
if ! $SKIP_BACKEND; then
  # Ensure backend server is running for integration tests
  if ensure_server_running; then
    # Run schema features test
    run_test "Schema Features Integration Test" "API_URL=http://localhost:$BACKEND_PORT/api node $SCRIPT_DIR/test-schema-features.js"
    if [ $? -eq 0 ]; then
      ((passed_tests++))
    else
      ((failed_tests++))
    fi
    ((total_tests++))
  else
    log_error "Skipping integration tests due to server startup failure"
    ((failed_tests++))
    ((total_tests++))
  fi
fi

# Test summary
echo -e "\n${BLUE}=================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=================================${NC}"
echo -e "Total tests: ${total_tests}"
echo -e "Passed: ${GREEN}${passed_tests}${NC}"
echo -e "Failed: ${RED}${failed_tests}${NC}"
echo ""

# Add summary to log
echo "" >> "$LOG_FILE"
echo "Test Summary" >> "$LOG_FILE"
echo "===========" >> "$LOG_FILE"
echo "Total tests: ${total_tests}" >> "$LOG_FILE"
echo "Passed: ${passed_tests}" >> "$LOG_FILE"
echo "Failed: ${failed_tests}" >> "$LOG_FILE"

# Exit with appropriate code
if [ $failed_tests -eq 0 ]; then
  log_success "All tests passed!"
  exit 0
else
  log_error "$failed_tests test(s) failed. See log for details: $LOG_FILE"
  exit 1
fi