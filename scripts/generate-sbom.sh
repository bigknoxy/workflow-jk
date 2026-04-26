#!/bin/bash

# Ensure we are in the root directory
cd "$(dirname "$0")/.."

echo "Generating SBOM..."
bun run scripts/generate-sbom.ts > sbom.json
echo "SBOM generated at sbom.json"
