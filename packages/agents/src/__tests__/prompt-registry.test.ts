import { describe, it, expect } from "vitest";
import {
  getPromptTemplate,
  getPromptVersion,
  listRegisteredPrompts,
} from "../prompts/registry.js";

const AGENT_NAMES = [
  "IntakeAgent",
  "RequirementsCriticAgent",
  "ArchitectAgent",
  "DevAgent",
  "QaAgent",
] as const;

describe("Prompt Registry", () => {
  describe("getPromptTemplate", () => {
    it("returns registered template for each agent", () => {
      for (const agentName of AGENT_NAMES) {
        const template = getPromptTemplate(agentName);
        expect(typeof template).toBe("string");
        expect(template.length).toBeGreaterThan(0);
      }
    });

    it("returns intake template containing product analyst keyword", () => {
      const template = getPromptTemplate("IntakeAgent");
      expect(template).toContain("product analyst");
    });

    it("returns critic template containing requirements analyst keyword", () => {
      const template = getPromptTemplate("RequirementsCriticAgent");
      expect(template).toContain("requirements analyst");
    });

    it("returns architect template containing principal software architect keyword", () => {
      const template = getPromptTemplate("ArchitectAgent");
      expect(template).toContain("principal software architect");
    });

    it("returns dev template containing expert developer keyword", () => {
      const template = getPromptTemplate("DevAgent");
      expect(template).toContain("expert developer");
    });

    it("returns qa template containing QA engineer keyword", () => {
      const template = getPromptTemplate("QaAgent");
      expect(template).toContain("QA engineer");
    });

    it("throws for unregistered agent", () => {
      expect(() => getPromptTemplate("UnknownAgent" as any)).toThrow(
        /No prompt template registered/
      );
    });

    it("throws for unregistered version", () => {
      expect(() => getPromptTemplate("IntakeAgent", "9.9.9" as any)).toThrow(
        /No prompt template registered/
      );
    });
  });

  describe("getPromptVersion", () => {
    it("returns current version for all agents", () => {
      for (const agentName of AGENT_NAMES) {
        const version = getPromptVersion(agentName);
        expect(version).toBe("1.0.0");
      }
    });
  });

  describe("listRegisteredPrompts", () => {
    it("lists all 5 registered prompts", () => {
      const list = listRegisteredPrompts();
      expect(list).toHaveLength(5);
    });

    it("includes all agent names", () => {
      const list = listRegisteredPrompts();
      const names = list.map((e) => e.agentName);
      for (const agentName of AGENT_NAMES) {
        expect(names).toContain(agentName);
      }
    });

    it("all entries have version 1.0.0", () => {
      const list = listRegisteredPrompts();
      for (const entry of list) {
        expect(entry.version).toBe("1.0.0");
      }
    });
  });
});