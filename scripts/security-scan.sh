#!/bin/bash

# Ensure we are in the root directory
cd "$(dirname "$0")/.."

echo "Running security scan..."

# Run bun audit and extract the JSON line (starts with {)
AUDIT_JSON=$(bun audit --json | grep "^{")

if [ -z "$AUDIT_JSON" ]; then
  echo "❌ Failed to capture audit results."
  exit 1
fi

# Check for high or critical vulnerabilities using jq
HIGH_CRITICAL_COUNT=$(echo "$AUDIT_JSON" | jq '[.[] | .[] | select(.severity == "high" or .severity == "critical")] | length')

if [ "$HIGH_CRITICAL_COUNT" -gt 0 ]; then
  echo "❌ Security scan failed: $HIGH_CRITICAL_COUNT high/critical vulnerabilities found."
  bun audit
  exit 1
else
  echo "✅ Security scan passed. No high or critical vulnerabilities found."
  exit 0
fi
