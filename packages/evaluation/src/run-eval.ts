import { createDeterministicFakeLLM } from "@workflow-jk/testing";
import { EvaluationRunner } from "./runner.js";
import { ALL_EVALUATION_CASES } from "./cases/index.js";
import type { EvaluationRunResult } from "./schemas.js";
import { writeFileSync } from "fs";

async function main() {
  console.log("=== Workflow-JK Evaluation Runner ===\n");
  console.log(`Running ${ALL_EVALUATION_CASES.length} evaluation cases...\n`);

  const provider = createDeterministicFakeLLM();
  const runner = new EvaluationRunner(provider);

  const result: EvaluationRunResult = await runner.runAll(ALL_EVALUATION_CASES);

  const reportJson = JSON.stringify(result, null, 2);
  writeFileSync("evaluation-results.json", reportJson);

  console.log("\n=== Results ===\n");
  console.log(`Total: ${result.totalCases} | Pass: ${result.passed} | Fail: ${result.failed} | Partial: ${result.partial}`);
  console.log(`Average Score: ${(result.averageScore * 100).toFixed(1)}%\n`);

  console.log("=== Per-Agent Summary ===\n");
  console.log("| Agent | Total | Passed | Avg Score |");
  console.log("|-------|-------|--------|-----------|");
  for (const [agent, summary] of Object.entries(result.summaryByAgent)) {
    console.log(`| ${agent} | ${summary.total} | ${summary.passed} | ${(summary.averageScore * 100).toFixed(1)}% |`);
  }

  console.log("\n=== Individual Results ===\n");
  console.log("| ID | Name | Agent | Grade | Score | Duration |");
  console.log("|----|------|-------|-------|-------|----------|");
  for (const r of result.results) {
    console.log(`| ${r.caseId} | ${r.caseName} | ${r.agentName} | ${r.grade} | ${(r.score * 100).toFixed(0)}% | ${r.durationMs}ms |`);
  }

  const failures = result.results.filter((r) => r.grade === "fail");
  if (failures.length > 0) {
    console.log("\n=== Failures ===\n");
    for (const f of failures) {
      console.log(`❌ ${f.caseId} (${f.agentName}): ${f.error ?? "Score too low"}`);
      if (f.schemaConformance.errors.length > 0) {
        console.log(`   Schema errors: ${f.schemaConformance.errors.join("; ")}`);
      }
    }
  }

  const mdReport = generateMarkdownReport(result);
  writeFileSync("evaluation-results.md", mdReport);

  console.log(`\nResults saved to evaluation-results.json and evaluation-results.md`);

  const exitCode = failures.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

function generateMarkdownReport(result: EvaluationRunResult): string {
  const lines: string[] = [
    "# Evaluation Results",
    "",
    `**Date:** ${result.timestamp}`,
    `**Run ID:** ${result.runId}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Cases | ${result.totalCases} |`,
    `| Passed | ${result.passed} |`,
    `| Failed | ${result.failed} |`,
    `| Partial | ${result.partial} |`,
    `| Average Score | ${(result.averageScore * 100).toFixed(1)}% |`,
    "",
    "## Per-Agent Summary",
    "",
    "| Agent | Total | Passed | Avg Score |",
    "|-------|-------|--------|-----------|",
  ];

  for (const [agent, summary] of Object.entries(result.summaryByAgent)) {
    lines.push(`| ${agent} | ${summary.total} | ${summary.passed} | ${(summary.averageScore * 100).toFixed(1)}% |`);
  }

  lines.push("");
  lines.push("## Detailed Results");
  lines.push("");
  lines.push("| ID | Name | Agent | Grade | Score | Duration |");
  lines.push("|----|------|-------|-------|-------|----------|");

  for (const r of result.results) {
    lines.push(`| ${r.caseId} | ${r.caseName} | ${r.agentName} | ${r.grade} | ${(r.score * 100).toFixed(0)}% | ${r.durationMs}ms |`);
  }

  const failures = result.results.filter((r) => r.grade === "fail");
  if (failures.length > 0) {
    lines.push("");
    lines.push("## Failures");
    lines.push("");
    for (const f of failures) {
      lines.push(`### ${f.caseId}: ${f.caseName}`);
      lines.push(`- **Agent:** ${f.agentName}`);
      lines.push(`- **Score:** ${(f.score * 100).toFixed(0)}%`);
      if (f.error) lines.push(`- **Error:** ${f.error}`);
      if (f.schemaConformance.errors.length > 0) {
        lines.push(`- **Schema Errors:**`);
        for (const e of f.schemaConformance.errors) {
          lines.push(`  - ${e}`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

main().catch((err) => {
  console.error("Evaluation runner failed:", err);
  process.exit(1);
});