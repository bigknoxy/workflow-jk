import { describe, it, expect } from "vitest";
import pg from "pg";

// Import each class directly from its file
import { PostgresProjectRepository } from "../real/postgres-project-repository";
import { PostgresWorkflowRepository } from "../real/postgres-workflow-repository";
import { PostgresApprovalRepository } from "../real/postgres-approval-repository";
import { PostgresArtifactStore } from "../real/postgres-artifact-store";

describe('Postgres adapter imports', () => {
  it('exports PostgresProjectRepository class', () => {
    expect(PostgresProjectRepository).toBeDefined();
    expect(typeof PostgresProjectRepository).toBe('function');
  });

  it('exports PostgresWorkflowRepository class', () => {
    expect(PostgresWorkflowRepository).toBeDefined();
    expect(typeof PostgresWorkflowRepository).toBe('function');
  });

  it('exports PostgresApprovalRepository class', () => {
    expect(PostgresApprovalRepository).toBeDefined();
    expect(typeof PostgresApprovalRepository).toBe('function');
  });

  it('exports PostgresArtifactStore class', () => {
    expect(PostgresArtifactStore).toBeDefined();
    expect(typeof PostgresArtifactStore).toBe('function');
  });
});

describe('Postgres adapter constructors', () => {
  it('PostgresProjectRepository accepts pool in constructor', () => {
    const pool = new pg.Pool();
    const repo = new PostgresProjectRepository({ pool });
    expect(repo).toBeDefined();
    pool.end();
  });

  it('PostgresWorkflowRepository accepts pool in constructor', () => {
    const pool = new pg.Pool();
    const repo = new PostgresWorkflowRepository({ pool });
    expect(repo).toBeDefined();
    pool.end();
  });

  it('PostgresApprovalRepository accepts pool in constructor', () => {
    const pool = new pg.Pool();
    const repo = new PostgresApprovalRepository({ pool });
    expect(repo).toBeDefined();
    pool.end();
  });

  it('PostgresArtifactStore accepts pool in constructor', () => {
    const pool = new pg.Pool();
    const store = new PostgresArtifactStore({ pool });
    expect(store).toBeDefined();
    pool.end();
  });
});

describe('Postgres adapter implements port interfaces', () => {
  // Integration tests require Docker + Postgres
  // These tests verify the classes can be instantiated with correct constructor shape
  
  it('PostgresProjectRepository has save method', () => {
    const pool = new pg.Pool();
    const repo = new PostgresProjectRepository({ pool });
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.getById).toBe('function');
    expect(typeof repo.list).toBe('function');
    pool.end();
  });

  it('PostgresWorkflowRepository has required methods', () => {
    const pool = new pg.Pool();
    const repo = new PostgresWorkflowRepository({ pool });
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.getById).toBe('function');
    expect(typeof repo.getByProjectId).toBe('function');
    expect(typeof repo.updateState).toBe('function');
    pool.end();
  });

  it('PostgresApprovalRepository has required methods', () => {
    const pool = new pg.Pool();
    const repo = new PostgresApprovalRepository({ pool });
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.getByWorkflowId).toBe('function');
    expect(typeof repo.getLatestByType).toBe('function');
    pool.end();
  });

  it('PostgresArtifactStore has required methods', () => {
    const pool = new pg.Pool();
    const store = new PostgresArtifactStore({ pool });
    expect(typeof store.save).toBe('function');
    expect(typeof store.getById).toBe('function');
    expect(typeof store.query).toBe('function');
    expect(typeof store.getLatestByType).toBe('function');
    pool.end();
  });
});