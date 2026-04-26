import { describe, it, expect } from 'vitest';
import { createDeterministicFakeLLM } from '../test-helpers';
import { FIXTURE_PROJECT_ID, FIXTURE_WORKFLOW_RUN_ID, VAGUE_PROJECT_INPUT, SAMPLE_BRIEF_CONTENT } from '../fixtures';
import { sum } from '../utils';

describe('Fixtures', () => {
  it('provides fixed project ID', () => {
    expect(FIXTURE_PROJECT_ID).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('provides fixed workflow run ID', () => {
    expect(FIXTURE_WORKFLOW_RUN_ID).toBe('00000000-0000-0000-0000-000000000002');
  });

  it('provides vague project input', () => {
    expect(VAGUE_PROJECT_INPUT).toBeDefined();
    expect(VAGUE_PROJECT_INPUT.title).toBe('Task Tracker');
    expect(VAGUE_PROJECT_INPUT.rawIdea).toContain('kanban');
  });

  it('provides sample brief content', () => {
    expect(SAMPLE_BRIEF_CONTENT).toBeDefined();
    expect(typeof SAMPLE_BRIEF_CONTENT).toBe('object');
  });
});

describe('createDeterministicFakeLLM', () => {
  it('returns configured response for matching prompt', async () => {
    const llm = createDeterministicFakeLLM();
    const result = await llm.complete('brief about the project');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns default response for non-matching prompt', async () => {
    const llm = createDeterministicFakeLLM();
    const result = await llm.complete('something unmatched');
    expect(typeof result).toBe('string');
  });

  it('tracks calls in call log', async () => {
    const llm = createDeterministicFakeLLM();
    await llm.complete('test prompt a');
    await llm.complete('test prompt b');
    const log = (llm as any).callLog;
    expect(log.length).toBe(2);
  });
});

describe('sum', () => {
  it('adds two positive numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });

  it('adds negative and positive numbers', () => {
    expect(sum(-5, 3)).toBe(-2);
  });

  it('adds two negative numbers', () => {
    expect(sum(-2, -3)).toBe(-5);
  });

  it('adds zero', () => {
    expect(sum(0, 5)).toBe(5);
    expect(sum(5, 0)).toBe(5);
    expect(sum(0, 0)).toBe(0);
  });

  it('adds decimal numbers', () => {
    expect(sum(0.1, 0.2)).toBeCloseTo(0.3);
  });
});