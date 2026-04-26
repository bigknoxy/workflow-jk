import { TestRunner } from "../ports";

export class FakeTestRunner implements TestRunner {
  private configuredResults: Map<string, { passed: number; failed: number; skipped: number; results: Array<{ name: string; status: "pass" | "fail" | "skip"; message?: string }> }> = new Map();
  private defaultResult: { passed: number; failed: number; skipped: number; results: Array<{ name: string; status: "pass" | "fail" | "skip"; message?: string }> } = {
    passed: 1,
    failed: 0,
    skipped: 0,
    results: [{ name: "default-test", status: "pass" as const }],
  };

  setResult(testFilter: string[], result: { passed: number; failed: number; skipped: number; results: Array<{ name: string; status: "pass" | "fail" | "skip"; message?: string }> }): void {
    const key = testFilter.sort().join(",");
    this.configuredResults.set(key, result);
  }

  setDefaultResult(result: { passed: number; failed: number; skipped: number; results: Array<{ name: string; status: "pass" | "fail" | "skip"; message?: string }> }): void {
    this.defaultResult = result;
  }

  async runTests(testFilter?: string[]): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    results: Array<{ name: string; status: "pass" | "fail" | "skip"; message?: string }>;
  }> {
    if (testFilter && testFilter.length > 0) {
      const key = testFilter.sort().join(",");
      const result = this.configuredResults.get(key);
      if (result) return result;
    }
    return this.defaultResult;
  }
}