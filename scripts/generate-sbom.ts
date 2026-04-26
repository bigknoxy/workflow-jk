import { join } from "path";
import { readdir, readFile } from "fs/promises";

async function findPackageJsons(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries
    .filter(e => e.isFile() && e.name === "package.json")
    .map(e => join(dir, e.name));

  const subDirs = entries.filter(e => e.isDirectory() && e.name !== "node_modules");
  for (const subDir of subDirs) {
    const subFiles = await findPackageJsons(join(dir, subDir.name));
    files.push(...subFiles);
  }

  return files;
}

async function main() {
  const rootDir = process.cwd();
  const packagePaths = await findPackageJsons(rootDir);
  
  const allDeps: Record<string, Set<string>> = {};

  for (const path of packagePaths) {
    try {
      const content = JSON.parse(await readFile(path, "utf-8"));
      const deps = { ...content.dependencies, ...content.devDependencies };
      
      for (const [name, version] of Object.entries(deps)) {
        if (!allDeps[name]) {
          allDeps[name] = new Set();
        }
        allDeps[name].add(version as string);
      }
    } catch (e) {
      console.error(`Failed to parse ${path}:`, e);
    }
  }

  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.4",
    metadata: {
      timestamp: new Date().toISOString(),
      tool: {
        vendor: "Workflow-JK",
        name: "generate-sbom.ts",
        version: "0.1.0"
      }
    },
    components: Object.entries(allDeps).flatMap(([name, versions]) => 
      Array.from(versions).map(version => ({
        type: "library",
        name,
        version,
        purl: `pkg:npm/${name}@${version.replace(/^[\^~]/, "")}`
      }))
    )
  };

  console.log(JSON.stringify(sbom, null, 2));
}

main().catch(console.error);
