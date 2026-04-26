import {
  IntakeAgentOutput,
  RequirementsCriticAgentOutput,
  ArchitectAgentOutput,
  DevAgentOutput,
  QaAgentOutput,
} from "@workflow-jk/contracts";
import type { AgentName } from "@workflow-jk/contracts";
import type { QualityCheckResult } from "./schemas.js";

type SchemaMap = Record<string, import("zod").ZodType>;

const AGENT_OUTPUT_SCHEMAS: SchemaMap = {
  IntakeAgent: IntakeAgentOutput,
  RequirementsCriticAgent: RequirementsCriticAgentOutput,
  ArchitectAgent: ArchitectAgentOutput,
  DevAgent: DevAgentOutput,
  QaAgent: QaAgentOutput,
};

export class ArtifactQualityScorer {
  checkRequiredFields(output: unknown, requiredFields: string[]): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    const obj = output as Record<string, unknown> | null;
    for (const field of requiredFields) {
      if (!obj) {
        result[field] = false;
        continue;
      }
      if (field.includes(".")) {
        result[field] = this.hasNestedField(obj, field);
      } else {
        result[field] = field in obj && obj[field] !== undefined && obj[field] !== null;
      }
    }
    return result;
  }

  checkSchemaConformance(output: unknown, agentName: AgentName): { passed: boolean; errors: string[] } {
    const schema = AGENT_OUTPUT_SCHEMAS[agentName];
    if (!schema) {
      return { passed: false, errors: [`No schema found for agent: ${agentName}`] };
    }
    const result = schema.safeParse(output);
    if (result.success) {
      return { passed: true, errors: [] };
    }
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return { passed: false, errors };
  }

  runQualityChecks(
    output: unknown,
    checks: Array<{ description: string; check: string; weight: number }>
  ): QualityCheckResult[] {
    const obj = output as Record<string, unknown> | null;
    return checks.map((check) => {
      const result = this.evaluateCheck(obj, check.check);
      return {
        description: check.description,
        passed: result.passed,
        evidence: result.evidence,
        weight: check.weight ?? 1,
      };
    });
  }

  private hasNestedField(obj: Record<string, unknown>, path: string): boolean {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== "object") {
        return false;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current !== undefined && current !== null;
  }

  private evaluateCheck(output: Record<string, unknown> | null, check: string): { passed: boolean; evidence: string } {
    if (!output) {
      return { passed: false, evidence: "Output is null" };
    }

    if (check.startsWith("has_")) {
      const field = check.replace("has_", "");
      const arrayVal = output[field];
      if (Array.isArray(arrayVal)) {
        const hasItems = arrayVal.length > 0;
        return {
          passed: hasItems,
          evidence: hasItems ? `Field '${field}' has ${arrayVal.length} items` : `Field '${field}' is empty`,
        };
      }
      const exists = field in output && output[field] !== undefined;
      return {
        passed: exists,
        evidence: exists ? `Field '${field}' is present` : `Field '${field}' is missing`,
      };
    }

    if (check.startsWith("min_length_")) {
      const match = check.match(/^min_length_(\d+)_(.+)$/);
      if (match) {
        const minLen = parseInt(match[1], 10);
        const field = match[2];
        const val = output[field];
        if (typeof val === "string") {
          const ok = val.length >= minLen;
          return { passed: ok, evidence: ok ? `Field '${field}' has length ${val.length} >= ${minLen}` : `Field '${field}' has length ${val.length} < ${minLen}` };
        }
        if (Array.isArray(val)) {
          const ok = val.length >= minLen;
          return { passed: ok, evidence: ok ? `Field '${field}' has ${val.length} items >= ${minLen}` : `Field '${field}' has ${val.length} items < ${minLen}` };
        }
        return { passed: false, evidence: `Field '${field}' is not a string or array` };
      }
    }

    if (check.startsWith("non_empty_string_")) {
      const field = check.replace("non_empty_string_", "");
      const val = output[field];
      const ok = typeof val === "string" && val.trim().length > 0;
      return { passed: ok, evidence: ok ? `Field '${field}' is a non-empty string` : `Field '${field}' is empty or not a string` };
    }

    if (check.startsWith("enum_in_")) {
      const match = check.match(/^enum_in_(.+)_field_(.+)$/);
      if (match) {
        const allowedValues = match[1].split("_");
        const field = match[2];
        const val = output[field];
        const ok = typeof val === "string" && allowedValues.includes(val);
        return { passed: ok, evidence: ok ? `Field '${field}' value '${val}' is in allowed values` : `Field '${field}' value '${val}' is not in allowed values` };
      }
    }

    if (check.startsWith("array_items_have_")) {
      const rest = check.slice("array_items_have_".length);
      const field = rest.includes("_field_") ? rest.slice(rest.lastIndexOf("_field_") + "_field_".length) : rest;
      const requiredKey = rest.slice(0, rest.lastIndexOf("_field_"));
      const arr = output[field];
      if (!Array.isArray(arr)) {
        return { passed: false, evidence: `Field '${field}' is not an array` };
      }
      const allHave = arr.every((item: unknown) => {
        if (typeof item === "object" && item !== null) {
          return requiredKey in (item as Record<string, unknown>);
        }
        return false;
      });
      return {
        passed: allHave,
        evidence: allHave ? `All items in '${field}' have key '${requiredKey}'` : `Some items in '${field}' missing key '${requiredKey}'`,
      };
    }

    if (check.startsWith("custom:")) {
      return { passed: true, evidence: `Custom check: ${check} (auto-passed)` };
    }

    return { passed: false, evidence: `Unknown check: ${check}` };
  }
}