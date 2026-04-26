# Build Integrity

This document describes the measures taken to ensure the integrity of the build process and the supply chain for the Workflow-JK project.

## Dependency Management

### Bun Lockfile
We use `bun.lockb` to ensure deterministic builds. The lockfile freezes the versions of all dependencies, including transitive dependencies, ensuring that every install produces the same `node_modules` structure.

**Integrity Measure:** The CI/CD pipeline should use `bun install --frozen-lockfile` to ensure that no changes to the lockfile are allowed during the build process.

### Scoped Packages
Internal packages are scoped under `@workflow-jk/` to prevent dependency confusion attacks and clearly distinguish internal modules from public ones.

## Supply Chain Security

### SBOM (Software Bill of Materials)
We generate an SBOM in CycloneDX format to maintain a record of all components used in the project. This allows for better tracking of vulnerabilities and license compliance.

- **Tool:** `scripts/generate-sbom.ts`
- **Output:** `sbom.json`

### Dependency Auditing
We perform regular security audits of our dependencies to identify and mitigate known vulnerabilities.

- **Command:** `bun audit`
- **Gatekeeping:** The `scripts/security-scan.sh` script is used in CI to fail the build if any **high** or **critical** vulnerabilities are detected.

## Build Process

The build process is managed by [Turbo](https://turbo.build/), which provides:
1. **Hashing:** Turbo hashes the inputs (source files, environment variables, etc.) for each task.
2. **Caching:** Build outputs are cached and only rebuilt when inputs change.
3. **Traceability:** Turbo's execution graph provides a clear trace of how artifacts are produced.

## Verification

To verify the integrity of a build:
1. Ensure `bun.lockb` is present and matches the `package.json` files.
2. Run `./scripts/security-scan.sh` to check for vulnerabilities.
3. Run `bun run build` and ensure all tasks complete successfully.
