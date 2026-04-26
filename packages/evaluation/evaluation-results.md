# Evaluation Results

**Date:** 2026-04-19T23:20:34.931Z
**Run ID:** eval-1776640834931

## Summary

| Metric | Value |
|--------|-------|
| Total Cases | 26 |
| Passed | 22 |
| Failed | 0 |
| Partial | 4 |
| Average Score | 95.4% |

## Per-Agent Summary

| Agent | Total | Passed | Avg Score |
|-------|-------|--------|-----------|
| IntakeAgent | 6 | 6 | 100.0% |
| RequirementsCriticAgent | 5 | 2 | 82.0% |
| ArchitectAgent | 5 | 5 | 100.0% |
| DevAgent | 5 | 4 | 94.0% |
| QaAgent | 5 | 5 | 100.0% |

## Detailed Results

| ID | Name | Agent | Grade | Score | Duration |
|----|------|-------|-------|-------|----------|
| intake-001 | Vague idea produces structured brief | IntakeAgent | pass | 100% | 4ms |
| intake-002 | Well-specified idea produces rich brief | IntakeAgent | pass | 100% | 0ms |
| intake-003 | Minimal input still produces valid brief | IntakeAgent | pass | 100% | 0ms |
| intake-004 | Technical project produces detailed constraints | IntakeAgent | pass | 100% | 1ms |
| intake-005 | Enterprise project brief includes scalability concerns | IntakeAgent | pass | 100% | 0ms |
| intake-006 | Consumer app brief captures user experience focus | IntakeAgent | pass | 100% | 0ms |
| critic-001 | Standard brief produces quality critique | RequirementsCriticAgent | partial | 70% | 1ms |
| critic-002 | Detailed brief identifies specific technical gaps | RequirementsCriticAgent | partial | 70% | 0ms |
| critic-003 | Vague brief surfaces ambiguity questions | RequirementsCriticAgent | pass | 100% | 0ms |
| critic-004 | Brief with contradictions flags risk | RequirementsCriticAgent | pass | 100% | 0ms |
| critic-005 | Enterprise brief identifies compliance gaps | RequirementsCriticAgent | partial | 70% | 0ms |
| architect-001 | Standard requirements produce complete architecture | ArchitectAgent | pass | 100% | 1ms |
| architect-002 | Architecture contains data flow description | ArchitectAgent | pass | 100% | 1ms |
| architect-003 | Architecture decisions include alternatives | ArchitectAgent | pass | 100% | 0ms |
| architect-004 | Task graph has dependencies | ArchitectAgent | pass | 100% | 1ms |
| architect-005 | NFR requirements influence architecture | ArchitectAgent | pass | 100% | 0ms |
| dev-001 | Standard task produces execution result | DevAgent | pass | 100% | 0ms |
| dev-002 | Dev result includes file paths | DevAgent | pass | 100% | 1ms |
| dev-003 | API endpoint task produces structured changes | DevAgent | partial | 70% | 0ms |
| dev-004 | Database task includes schema changes | DevAgent | pass | 100% | 0ms |
| dev-005 | Frontend task produces component changes | DevAgent | pass | 100% | 0ms |
| qa-001 | Passing dev result produces pass report | QaAgent | pass | 100% | 1ms |
| qa-002 | QA report includes AC results for each criterion | QaAgent | pass | 100% | 0ms |
| qa-003 | Failed dev result produces fail report with defects | QaAgent | pass | 100% | 0ms |
| qa-004 | QA report severity levels are valid | QaAgent | pass | 100% | 0ms |
| qa-005 | Multiple AC criteria mapped to requirements | QaAgent | pass | 100% | 0ms |