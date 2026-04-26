import { RepoProvider } from "../ports";

export function validateRepoPath(path: string, deniedPatterns: string[] = []): boolean {
  const normalizedPath = path.replace(/^\/+/, "");

  if (normalizedPath.startsWith("..")) {
    return false;
  }
  if (normalizedPath.startsWith("etc/") || normalizedPath.startsWith("etc\\")) {
    return false;
  }
  if (normalizedPath.includes("~")) {
    return false;
  }

  for (const pattern of deniedPatterns) {
    const cleanPattern = pattern.replace(/^\*\*\//, "").replace(/^\*\./, "");
    if (normalizedPath.includes(cleanPattern)) {
      return false;
    }
  }

  return true;
}

const DEFAULT_DENIED_PATTERNS = [".env", ".git", "node_modules", ".secret", ".key", ".pem"];

export class FakeRepoProvider implements RepoProvider {
  readonly name = "fake-repo";
  private files: Map<string, string> = new Map();
  private branches: Set<string> = new Set(["main"]);
  private commitCount = 0;
  private deniedPatterns: string[] = DEFAULT_DENIED_PATTERNS;

  async createFile(path: string, content: string): Promise<{ path: string; sha: string }> {
    if (!validateRepoPath(path, this.deniedPatterns)) {
      throw new Error(`Invalid path: ${path}`);
    }
    this.files.set(path, content);
    return { path, sha: `sha-${path}-${Date.now()}` };
  }

  async updateFile(path: string, content: string): Promise<{ path: string; sha: string }> {
    if (!validateRepoPath(path, this.deniedPatterns)) {
      throw new Error(`Invalid path: ${path}`);
    }
    this.files.set(path, content);
    return { path, sha: `sha-${path}-${Date.now()}` };
  }

  async deleteFile(path: string): Promise<{ path: string; sha: string }> {
    if (!validateRepoPath(path, this.deniedPatterns)) {
      throw new Error(`Invalid path: ${path}`);
    }
    this.files.delete(path);
    return { path, sha: `sha-deleted-${path}` };
  }

  async getFile(path: string): Promise<{ path: string; content: string }> {
    if (!validateRepoPath(path, this.deniedPatterns)) {
      throw new Error(`Invalid path: ${path}`);
    }
    const content = this.files.get(path);
    if (!content) throw new Error(`File not found: ${path}`);
    return { path, content };
  }

  async listFiles(prefix?: string): Promise<string[]> {
    const paths = Array.from(this.files.keys());
    if (prefix) return paths.filter((p) => p.startsWith(prefix));
    return paths;
  }

  async createBranch(name: string): Promise<string> {
    this.branches.add(name);
    return name;
  }

  async createCommit(message: string, files: Array<{ path: string; content: string }>): Promise<{ sha: string }> {
    for (const file of files) {
      if (!validateRepoPath(file.path, this.deniedPatterns)) {
        throw new Error(`Invalid path: ${file.path}`);
      }
      this.files.set(file.path, file.content);
    }
    this.commitCount++;
    return { sha: `commit-${this.commitCount}` };
  }

  getFiles() { return new Map(this.files); }
  getBranches() { return new Set(this.branches); }
}