import { BrowserRunner } from "../ports";

export class FakeBrowserRunner implements BrowserRunner {
  private configuredResults: Map<string, { passed: boolean; results: Array<{ check: string; passed: boolean; details: string }> }> = new Map();

  setResult(url: string, result: { passed: boolean; results: Array<{ check: string; passed: boolean; details: string }> }): void {
    this.configuredResults.set(url, result);
  }

  async runCheck(url: string, checks: string[]): Promise<{
    passed: boolean;
    results: Array<{ check: string; passed: boolean; details: string }>;
  }> {
    const configured = this.configuredResults.get(url);
    if (configured) return configured;
    return {
      passed: true,
      results: checks.map((check) => ({ check, passed: true, details: "fake pass" })),
    };
  }
}