#!/usr/bin/env bash

if [ -f herokurules.txt ]; then
# Clear old files
  make clearDocs

# Run code quality tools
  npm run-script jshint

# Generate coverage report
  echo "We are generating coverage report..."
  npm run-script coverage
  echo "We have generated coverage report!"

# Generate test report
  echo "We are generating test report..."
  npm run-script testReport
  echo "We have generated test report!"

# Generate documentation
  echo "We are generating documentation..."
  npm run-script docs
  echo "We have generated documentation!"

# Build frontend code
  echo "We are generating frontend..."
  npm run-script frontend
  echo "We have generated frontend!"
else
# It is production installation, do not run tests and generate documentation.
  echo "HuntJS installing ok!"
fi